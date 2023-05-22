
import { TextBasedChannel, TextBasedChannelResolvable } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { Context } from "./Context";
import { load } from "cheerio";
import fetch from "node-fetch";
import toml from "toml";
import fs from "fs";

import type { Hikari } from "../Hikari";
import { Source } from "../structures/Source";

export enum ProxyType {
    Aicg
}

export interface Prompts {
    completion_prompt: string[];
    private_completion_prompt: string[];
    image_curator_prompt: string[];
}

/**
 * An abstraction to work away everything related to AI functionality, and properly separate it from the rest of the code.
 */
export class Agent {
    /** The OpenAI API instance. */
    public ai?: OpenAIApi;
    /** The assigned name of te bot */
    public name: string;
    /** The configured prompt to use for the AI. */
    public prompt: string;
    /** The configured prompt to use for the AI. */
    public dm_prompt: string;
    /** All of the internal prompts used by the AI. */
    public internal_prompts: Prompts;
    /** The GPT model to use when creating completions.  */
    public model: string;
    /** The configuration for the OpenAI API. */
    public openaiConfig!: Configuration;
    /** Propogated events to the AI Agent from text channels. */
    public contexts: Map<TextBasedChannelResolvable, Context>;
    public source!: Source;

    constructor(
        public client: Hikari
    ) {
        this.model = client.configuration.bot.ai.model;
        this.name = client.configuration.bot.information.bot_name;
        this.contexts = new Map();

        this.logger.debug("Agent: Initializing the agent...");
        this.logger.trace("Agent: Parsing prompts for the agent.");
        
        this.internal_prompts = toml.parse(fs.readFileSync("./prompts.toml", "utf-8"));

        this.prompt = `${
            this.client.configuration.bot.information.prompt.join(" ")
        }\n\n${
            this.internal_prompts.completion_prompt.join(" ")
        }`;

        if (this.client.configuration.bot.information.dm_prompt.length === 0) {
            this.logger.warn("Agent: No DM prompt was provided, using the default prompt.");

            this.client.configuration.bot.information.dm_prompt = this.client.configuration.bot.information.prompt;
        }
        
        this.dm_prompt = `${
            this.client.configuration.bot.information.dm_prompt.join(" ")
        }\n\n${
            this.internal_prompts.private_completion_prompt.join(" ")
        }`;

        const source = this.client.stores.get("sources").get(this.client.configuration.bot.ai.source);

        if (!source) {
            this.logger.fatal("Agent: The source provided in the configuration file does not exist.");
            this.logger.fatal("Agent: Please check your configuration file and try again.");
            return process.exit(1);
        }

        this.source = source;
        
        this.openaiConfig = new Configuration();
        this.assignPromptValues();
    }

    get logger() {
        return this.client.logger;
    }

    public getPrompt(key: keyof Prompts) {
        return this.internal_prompts[key].join(" ");
    }

    /**
     * Creates the OpenAI API instance.
     */
    public create() {
        this.ai = new OpenAIApi(this.openaiConfig);
    }

    /**
     * Creates a context for this channel, or returns one if any exists.
     * @param channel The channel to create a context for.
     */
    public async context(resolvable: TextBasedChannelResolvable) {
        if (!this.contexts.has(resolvable)) {
            const channel = this.client.channels.resolve(resolvable) ?? await this.client.channels.fetch(
                resolvable as string
            );
            
            this.logger.info("Agent: Handling the creation of a context for channel", channel?.id);
            this.contexts.set(resolvable, new Context(this, channel as TextBasedChannel));
        }
 
        return this.contexts.get(resolvable);
    }

    /**
     * Attempts to set the proxy that's best suited for the client.
     */
    public async attemptSetProxy() {
        if (this.client.configuration.proxy.use_proxy == false) {
            this.logger.info("Agent: Proxy usage is disabled, so the agent will not attempt to set a proxy.");

            this.openaiConfig = new Configuration({
                apiKey: this.client.configuration.bot.keys.openai
            });

            return;
        }

        const proxies: Record<string, {
            time: number;
            type: ProxyType;
            data: any;
        }> = {};

        this.logger.trace("Agent: Attempting to set a usable proxy from the list of them.");

        for (const proxy of this.client.configuration.proxy.preferred_proxies) {
            this.logger.trace(
                "Agent: Testing proxy",
                this.client.logger.color.hex("#a7e5fa")(proxy), // i think it'd be better to move this hex color thing to a separate constant
                "for viable use.."
            );

            const start = Date.now();
            const homepage = await fetch(proxy);

            if (homepage.status != 200) {
                this.client.logger.error(
                    "Agent: Proxy",
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "wasnt't found, so it's likely a dead link."
                );

                continue;
            }

            const $ = load(await homepage.text());
            const data = JSON.parse($("body > pre").text());

            if (data.config.promptLogging == "true") {
                this.client.logger.warn(
                    "Agent: Proxy",
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "is logging prompts, which is very risky for the privacy of the users."
                );

                if (this.client.configuration.proxy.no_loggers) {
                    this.client.logger.warn("Because of the current configuration, this proxy will not be used.");
                    continue;
                }
            }

            const ppx = await fetch(`${proxy}/api/v1`, {
                headers: {
                    "Authorization": `Bearer ${this.client.configuration.proxy.keys[proxy]}`,
                }
            });

            // Test the proxy for an OpenAI API call
            if (ppx.status != 404) {
                if (ppx.status == 401) {
                    if (this.client.configuration.proxy.keys[proxy]) {
                        this.client.logger.error(
                            "Agent: Proxy",
                            this.client.logger.color.hex("#a7e5fa")(proxy),
                            "has an invalid API key."
                        );
                    } else {
                        this.client.logger.error(
                            "Agent: Proxy",
                            this.client.logger.color.hex("#a7e5fa")(proxy),
                            "is missing an API key even though it requires one."
                        );
                    }
                } else {
                    this.client.logger.error(
                        "Agent: Proxy",
                        this.client.logger.color.hex("#a7e5fa")(proxy),
                        "didn't return 404, so it's not a valid proxy."
                    );
                }
                continue;
            }

            proxies[proxy] = {
                time: Date.now() - start,
                type: ProxyType.Aicg, // TODO: Add proper proxy type detection
                data,
            };
        }
        
        this.logger.debug("Agent: Gathered a list of workable proxies.");
        this.logger.debug("Agent: Proxy List Size:", Object.keys(proxies).length);
        this.logger.trace("Agent: Determining which one works the best for our usecases");

        if (Object.keys(proxies).length === 0) {
            this.client.logger.fatal("Agent: No proxies were found to be valid. Please check your configuration.");
            process.exit(1);
        }

        const fastest = Object.keys(proxies).reduce(
            (a, b) => proxies[a].time < proxies[b].time ? a : b
        );

        const proxy = proxies[fastest];
        const basePath = proxy.data.endpoints.openai;  // TODO: support proxy types
        this.openaiConfig = new Configuration({ basePath });

        this.client.logger.info(
            "Agent: Proxy",
            this.client.logger.color.yellow(fastest),
            "was found to be the best proxy available, and will be used."
        );
    }

    private assignPromptValues() {
        this.prompt = this.prompt
            .replace(/%bot_name%/g, this.client.configuration.bot.information.bot_name);  // TODO: add more parameters LOL

        this.dm_prompt = this.dm_prompt
            .replace(/%bot_name%/g, this.client.configuration.bot.information.bot_name);  // TODO: add more parameters LOL
            
    }
}
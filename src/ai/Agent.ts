import fetch from "node-fetch";
import fs from "fs";
import toml from "toml";
import type { Hikari } from "../Hikari";
import { load } from "cheerio";
import { Configuration, OpenAIApi } from "openai";
import { TextBasedChannel, TextBasedChannelResolvable } from "discord.js";
import { Context } from "./Context";

export enum ProxyType {
    Aicg
}

export interface Prompts {
    completion_prompt: string[];
    image_curator_prompt: string[];
}

/**
 * An abstraction to work away everything related to AI functionality, and properly separate it from the rest of the code.
 */
export class Agent {
    /**
     * The client that instantiated this agent.
     */
    public client: Hikari;

    /**
     * The OpenAI API instance.
     */
    public ai?: OpenAIApi;

    public name: string;

    /**
     * The configured prompt to use for the AI.
     */
    public prompt: string;

    /**
     * All of the internal prompts used by the AI.
     */
    public internal_prompts: Prompts;

    public model: string;

    /**
     * The configuration for the openai API.
     */
    public openaiConfig: Configuration;

    public contexts: Map<TextBasedChannelResolvable, Context>;

    constructor(client: Hikari) {
        this.client = client;
        this.contexts = new Map();
        this.name = client.configuration.bot.information.bot_name;
        this.model = client.configuration.proxy.model;

        this.logger.debug("Agent: Initializing the agent...");

        // Get the base prompts
        let tomlFile: any;
        try {
            this.logger.trace("Agent: Parsing prompts for the agent.");
            tomlFile = toml.parse(fs.readFileSync("./prompts.toml", "utf-8"));
        } catch (e) {
            console.error("Failed to parse config.toml file.");
            console.error(e);
        }

        this.internal_prompts = tomlFile;
        this.prompt = `${this.client.configuration.bot.information.prompt.join(" ")}\n\n${tomlFile.completion_prompt.join(" ")}`;
        this.openaiConfig = new Configuration();
        this.assignPromptValues();
    }

    get logger() {
        return this.client.logger;
    }

    getPrompt(key: keyof Prompts) {
        return this.internal_prompts[key].join(" ");
    }

    /**
     * Creates the OpenAI API instance.
     */
    public create() {
        this.ai = new OpenAIApi(this.openaiConfig);
    }

    /**
     * Creates a context for this channel, or gets it if any exists.
     * @param channel 
     */
    async context(channel: TextBasedChannelResolvable) {
        let c = this.client.channels.resolve(channel);

        if (!c) {
            if (typeof channel === "string") {
                c = await this.client.channels.fetch(channel);
            } else {
                c = channel; // lmao it's already a channel
            }
        }

        let ctx = this.contexts.get(channel);
        if (!this.contexts.has(channel)) {
            this.logger.trace("Agent: Handling the creation of a context for", c?.id);
            ctx = new Context(this, c as TextBasedChannel);

            this.contexts.set(channel, ctx);
        }
 
        return ctx;
    }

    /**
     * Attempts to set the proxy that's best suited for the client.
     */
    async attemptSetProxy() {
        const proxyTimes: Record<string, {
            time: number;
            type: ProxyType;
            proxyData: any;
        }> = {};

        this.logger.trace("Agent: Attempting to set a usable proxy from the list of them.");

        for (const proxy of this.client.configuration.proxy.preferred_proxies) {
            this.logger.trace(
                "Agent: Testing proxy",
                this.client.logger.color.hex("#a7e5fa")(proxy),
                "for viable use.."
            );

            const start = Date.now();
            const homepage = await fetch(proxy);

            if (homepage.status === 200) {
                const html = await homepage.text();
                const $ = load(html);

                const proxyData = JSON.parse($("body > pre").text());

                if (proxyData.config.promptLogging === "true") {
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

                // Test the proxy for an OpenAI API call
                const apiTest = await fetch(`${proxy}/api/v1`);

                if (apiTest.status !== 404) {
                    this.client.logger.error("Agent: Proxy", this.client.logger.color.hex("#a7e5fa")(proxy), "didn't return not found, so it's not a valid proxy.");
                    continue;
                }

                const end = Date.now();
                proxyTimes[proxy] = {
                    time: end - start,
                    type: ProxyType.Aicg, // TODO: Add proper proxy type detection
                    proxyData
                };
            } else {
                this.client.logger.error("Agent: Proxy", this.client.logger.color.hex("#a7e5fa")(proxy), "wasnt't found, so it's likely a dead link.");
            }
        }
        
        this.logger.debug("Agent: Gathered a list of workable proxies.");
        this.logger.debug("Agent: Proxy List Size:", Object.keys(proxyTimes).length);
        this.logger.trace("Agent: Determining which one works the best for our usecases");

        if (Object.keys(proxyTimes).length === 0) {
            this.client.logger.fatal("Agent: No proxies were found to be valid. Please check your configuration.");
            process.exit(1);
        }

        const fastestProxy = Object.keys(proxyTimes).reduce((a, b) => proxyTimes[a].time < proxyTimes[b].time ? a : b);

        if (fastestProxy) {
            const proxy = proxyTimes[fastestProxy];
            
            // TODO: support proxy types
            const url = proxy.proxyData.endpoints.openai;

            this.openaiConfig = new Configuration({
                basePath: url,
            });

            this.client.logger.info("Agent: Proxy", this.client.logger.color.yellow(fastestProxy), "was found to be the best proxy available, and will be used.");
        }
    }

    private assignPromptValues() {
        this.prompt = this.prompt.replace(/%bot_name%/g, this.client.configuration.bot.information.bot_name);
    }
}
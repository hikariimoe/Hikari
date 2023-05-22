
import { TextBasedChannel, TextBasedChannelResolvable } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { Context } from "./Context";
import { load } from "cheerio";
import fetch from "node-fetch";
import toml from "toml";
import fs from "fs";

import type { Hikari } from "../Hikari";
import { Source } from "../structures/Source";
import { DiscordInstructionData, InstructionData, InstructionResponseData } from "../util/InstructionConstants";

export enum ProxyType {
    Aicg
}

export interface Prompts {
    [key: string]: string | string[];

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

        // TODO
        this.prompt = `${this.getBasePrompt("prompt")}\n\n\n${this.getPrompt("completion_prompt")}`;

        if (this.client.configuration.bot.information.dm_prompt.length === 0) {
            this.logger.warn("Agent: No DM prompt was provided, using the default prompt.");

            this.dm_prompt = `${this.getBasePrompt("prompt")}\n\n${this.getPrompt("completion_prompt")}`;
        } else {
            this.dm_prompt = `${this.getBasePrompt("dm_prompt")}\n\n${this.getPrompt("completion_prompt")}`;
        }

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
        return (this.internal_prompts[key] as string[]).join(" ").replace(/\n\s/g, "\n");
    }

    public getBasePrompt(key: "prompt" | "dm_prompt") {
        return this.client.configuration.bot.information[key].join(" ").replace(/\n\s/g, "\n");
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
        this.prompt = this.handleActionList(this.prompt)

        const regex = /%([\w.]*)%/g;

        for (let match of this.prompt.matchAll(regex)) {
            switch (match[1]) {
                case "bot_name":
                    this.prompt = this.prompt.replace(match[0], this.client.configuration.bot.information.bot_name);
                    break;

                default:
                    if (match[1].startsWith("internal")) {
                        const key = match[1].split(".")[1];

                        console.log(key);

                        if (key in this.internal_prompts) {
                            this.prompt = this.prompt.replace(match[0], this.internal_prompts[key] as string);
                        }
                    }
                    break;
            }
        }

        console.log(this.prompt)

        //this.dm_prompt = this.handleActionList(this.dm_prompt)
        //    .replace(/%bot_name%/g, this.client.configuration.bot.information.bot_name);  // TODO: add more parameters LOL
    }

    // TODO: Jesus christ this is a mess
    private handleActionList(prompt: string): string {
        const allowedActions = this.client.configuration.bot.ai.actions;
        const allowedDiscordActions = this.client.configuration.bot.ai.discord_actions;

        const instructions = [];
        const responses = [];
        const discordActions = [];
        const imageInstructions = [
            "search_images",
        ];

        for (let key of Object.keys(InstructionData)) {
            if (!allowedActions.includes(key)) {
                continue;
            }

            instructions.push(`"${key}" - ${JSON.stringify(InstructionData[key as keyof typeof InstructionData])}`);
        }

        for (let key of Object.keys(InstructionResponseData)) {
            responses.push(`"${key}" - ${JSON.stringify(InstructionResponseData[key as keyof typeof InstructionResponseData])}`);
        }

        if (allowedActions.includes("discord_action")) {
            for (let key of Object.keys(DiscordInstructionData)) {
                if (!allowedDiscordActions.includes(key)) {
                    continue;
                }
                
                discordActions.push(`"${key}" - ${DiscordInstructionData[key as keyof typeof DiscordInstructionData]}`);
            }
        }

        if (instructions.length == 0) {
            prompt = prompt.replace(/%action_list%/g, "\n")
        } else {
            prompt = prompt.replace(/%action_list%/g, [
                "\n\n%internal.action_perform%",
                JSON.stringify({
                    type: "action_name",
                    parameters: {
                        parameter_name: "parameter_value"
                    }
                }),
                "\n",
                "%internal.action_list%",
                ...instructions,
            ].join("\n"));
        }

        if (discordActions.length == 0) {
            prompt = prompt.replace(/%discord_action_list%/g, "");
        } else {
            prompt = prompt.replace(/%discord_action_list%/g, [
                "\n\n\n%internal.discord_action_list%",
                ...discordActions,
            ].join("\n"));
        }

        if (instructions.length == 0 || responses.length == 0) {
            prompt = prompt.replace(/%action_response_list%/g, "");
        } else {
            prompt = prompt.replace(/%action_response_list%/g, [
                "\n\n\n%internal.action_response_list%",
                ...responses,
                ["\n\nFor math questions, you will pretty much always be given a wolfram alpha query, and you will be expected to respond with the answer to that query from wolfram alpha.",
                "You will wait for an acceptance before doing any actions, mainly if they revolve around searching the internet.",
                "If you have an action you want to do, text should always be undefined, or avoidant of anything that could be redundant as you're going to respond on the next message with the result anyways.",
                "%internal.upload_image_warning%"].join(" "),
                "\n"
            ].join("\n"));
        }

        if (instructions.filter(x => imageInstructions.includes(JSON.parse(x.split(" - ")[0]))).length == 0) {
            prompt = prompt.replace("%internal.upload_image_warning%", "");
        }

        if (instructions.length == 0) {
            prompt = prompt.replace("%json_format%", JSON.stringify({
                username: "%bot_name%",
                text: "your response to the latest message",
            }));
        } else {
            prompt = prompt.replace("%json_format%", JSON.stringify({
                username: "%bot_name%",
                text: "your response to the latest message",
                action: "the action you want to perform (nullable)"
            }));
        }

        return prompt.replace(/\n\s/g, "\n");
    }
}
import { DiscordInstructionData, InstructionData, InstructionResponseData } from "../util/InstructionConstants";
import { Channel, TextBasedChannel, TextBasedChannelResolvable } from "discord.js";
import { Source } from "../structures/Source";
import { Configuration } from "openai";
import { Context } from "./Context";
import { load } from "cheerio";
import fetch from "node-fetch";
import toml from "toml";
import fs from "fs";

import type { Hikari } from "../Hikari";

export enum ProxyType {
    Aicg
}

export interface Prompts {
    [key: string]: string | string[];
    completion_prompt: string[];
    simple_completion_prompt: string[];
    image_curator_prompt: string[];
}

/**
 * An abstraction to work away everything related to AI functionality, and properly separate it from the rest of the code.
 */
export class Agent {
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
    /** Propogated events to the AI Agent from text channels. */
    public contexts: Map<TextBasedChannelResolvable, Context>;
    // TODO: We should eventually find a way to remove this property and move it to the according source.
    //       In order to do that however, we also need to find a way to have the configuration
    //       statically available to the source at startup so that there's no cold time start (when it's looking for a proxy)
    //       whenever a user sends a message.
    //
    //       ~ Alya
    public openaiConfig?: Configuration;
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
        this.prompt = this.getBasePrompt("prompt");

        if (this.client.configuration.bot.information.dm_prompt.length === 0) {
            this.logger.warn("Agent: No DM prompt was provided, using the default prompt.");

            this.dm_prompt = this.getBasePrompt("prompt");
        } else {
            this.dm_prompt = this.getBasePrompt("dm_prompt");
        }

        if (!this.client.stores.get("sources").has(this.client.configuration.bot.ai.source)) {
            this.logger.fatal("Agent: The source provided in the configuration file does not exist.");
            this.logger.fatal("Agent: Please check your configuration file and try again.");
            return process.exit(1);
        }

        // eslint-disable @typescript-eslint/no-non-null-assertion
        this.source = this.client.stores.get("sources").get(this.client.configuration.bot.ai.source)!;
        this.openaiConfig = new Configuration();
    }

    get logger() {
        return this.client.logger;
    }

    public getPrompt(key: keyof Prompts) {
        return (this.internal_prompts[key] as string[])
            .join(" ").replace(/\n\s/g, "\n");
    }

    public getBasePrompt(key: "prompt" | "dm_prompt") {
        return this.client.configuration.bot.information[key]
            .join(" ").replace(/\n\s/g, "\n");
    }

    public getCompletionPrompt(channel: Channel) {
        const { minimal, minimal_mode } = this.client.configuration.bot.ai;
        let completionPrompt: string = "";

        if (minimal) {
            // switch (minimal_mode) {}
        } else {
            completionPrompt = this.getPrompt("completion_prompt");
        }

        // NOTE: yui do not make this a god damn one-liner
        // :(
        if (channel.isDMBased()) {
            completionPrompt = completionPrompt.replace("%completion_channel%", "%internal.dm_channel%");
        } else if (channel.isThread()) {
            completionPrompt = completionPrompt.replace("%completion_channel", "%internal.public_channel%");
        } else if (channel.isTextBased()) {
            completionPrompt = completionPrompt.replace(
                "%completion_channel%",
                channel.nsfw ? "%internal.nsfw_channel%" : "%internal.public_channel%"
            );
        }

        return this.assignPromptValues(completionPrompt);
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
        if (!this.client.configuration.proxy.use_proxy) {
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

            if (homepage.status !== 200) {
                this.client.logger.error(
                    "Agent: Proxy",
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "wasnt't found, so it's likely a dead link."
                );

                continue;
            }

            const $ = load(await homepage.text());
            const data = JSON.parse($("body > pre").text());

            if (data.config.promptLogging === "true") {
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
            if (ppx.status === 401) {
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
            } else if (ppx.status !== 404) {
                this.client.logger.error(
                    "Agent: Proxy",
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "didn't return 404, so it's not a valid proxy."
                );
            } else {
                proxies[proxy] = {
                    time: Date.now() - start,
                    type: ProxyType.Aicg, // TODO: Add proper proxy type detection
                    data,
                };
            }
        }

        const proxyCount = Object.keys(proxies).length;
        this.logger.debug("Agent: Gathered a list of workable proxies.");
        this.logger.debug("Agent: Proxy List Size:", proxyCount);
        this.logger.trace("Agent: Determining which one works the best for our usecases");

        if (proxyCount === 0) {
            this.client.logger.fatal("Agent: No proxies were found to be valid. Please check your configuration.");
            process.exit(1);
        }

        const proxy = Object.keys(proxies).reduce(
            (a, b) => proxies[a].time < proxies[b].time ? a : b
        );

        this.client.logger.info(
            "Agent: Proxy",
            this.client.logger.color.yellow(proxy),
            "was found to be the best proxy available, and will be used."
        );

        // TODO: support proxy types
        this.openaiConfig = new Configuration({
            basePath: proxies[proxy].data.endpoints.openai
        });
    }

    public assignPromptValues(prompt: string): string {
        prompt = this.handleActionList(prompt);

        for (const match of prompt.matchAll(/%([\w.]*)%/g)) {
            if (match[1] === "bot_name") {
                prompt = prompt.replace(match[0], this.client.configuration.bot.information.bot_name);
            } else if (match[1].startsWith("internal")) {
                prompt = prompt.replace(
                    match[0],
                    this.internal_prompts[match[1].split(".")[1]].toString() || "$&"
                );
            }
        }

        return prompt;
    }

    public handleActionList(prompt: string): string {
        // TODO: Jesus christ this is a mess
        // upd: still a mess imo but better than it was before

        const allowedDiscordActions = this.client.configuration.bot.ai.discord_actions;
        const allowedActions = this.client.configuration.bot.ai.actions;

        const instructions = Object.entries(InstructionData)
            .filter(([key]) => allowedActions.includes(key))
            .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`);
        //  ^^^^ this is repeated 3 times, maybe move to a separate function?

        console.log(instructions)

        const responses = Object.entries(InstructionResponseData)
            .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`);

        const discordActions = allowedActions.includes("discord_action")
            ? Object.entries(DiscordInstructionData)
                .filter(([key]) => allowedDiscordActions.includes(key))
                .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`)
            : [];

        const imageInstructions = [
            "search_images"
        ];

        return prompt
            .replace(
                /%action_list%/g,
                instructions.length > 0
                    ? [
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
                    ].join("\n") : "\n"
            )
            .replace(
                /%discord_action_list%/g,
                discordActions.length > 0
                    ? [
                        "\n\n%internal.discord_action_list%",
                        ...discordActions,
                    ].join("\n") : "\n"
            )
            .replace(
                /%action_response_list%/g,
                instructions.length > 0 && responses.length > 0
                    ? [
                        "\n\n%internal.action_response_list%",
                        ...responses,
                        "%internal.math_warning%",
                        "%internal.upload_image_warning%"
                    ].join("\n") : "\n"
            )
            .replace(
                /%json_format%/g,
                JSON.stringify({
                    username: "%bot_name%",
                    text: "your response to the latest message",
                    ...(
                        instructions.length > 0 ? {
                            action: "the action you want to perform (nullable)"
                        } : {}
                    )
                })
            )
            .replace(
                /%internal.upload_image_warning%/g,
                instructions.filter(
                    (x) => imageInstructions.includes(
                        // eslint-disable @typescript-eslint/no-non-null-assertion
                        x.match(/"(.+?)"/)![1]
                    )
                ).length > 0 ? "$&" : ""
            )
            .replace(/\n\s/g, "\n");
    }
}
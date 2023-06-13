import { DiscordActionData, ActionData, ActionResponseData } from "../util/ActionConstants";
import { Channel, TextBasedChannel, TextBasedChannelResolvable, User } from "discord.js";
import { Source } from "../structures/Source";
import { encode } from "gpt-tokenizer";
import { Configuration } from "openai";
import { Context } from "./Context";
import { load } from "cheerio";
import fetch from "node-fetch";
import toml from "toml";
import fs from "fs";

import type { Hikari } from "../Hikari";
import { Util } from "../util/Util";

export enum ProxyType {
    Aicg
}

export interface Prompts {
    [key: string]: string | string[];
    completion_prompt: string[];
    simple_completion_prompt: string[];
    image_curator_prompt: string[];
}

interface PrimativeMessage {
    channel: Channel;
    author?: User;
}

const HARASS_FOR_TOKENS = 500;

/**
 * An abstraction to work away everything related to AI functionality, and properly separate it from the rest of the code.
 */
export class Agent {
    /** The assigned name of te bot */
    public name: string;
    /** The configured prompt to use for the AI. */
    public prompt: string = "";
    /** The configured prompt to use for the AI. */
    public dm_prompt: string = "";
    /** All of the internal prompts used by the AI. */
    public internal_prompts: Prompts = {
        completion_prompt: [],
        simple_completion_prompt: [],
        image_curator_prompt: []
    };
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

        if (!this.client.stores.get("sources").has(this.client.configuration.bot.ai.source)) {
            this.logger.fatal("Agent: The source provided in the configuration file does not exist.");
            this.logger.fatal("Agent: Please check your configuration file and try again.");
            return process.exit(1);
        }

        // eslint-disable @typescript-eslint/no-non-null-assertion
        this.source = this.client.stores.get("sources").get(this.client.configuration.bot.ai.source)!;
        this.openaiConfig = new Configuration();
    }

    public loadPrompts() {
        this.internal_prompts = toml.parse(fs.readFileSync("./prompts.toml", "utf-8"));
        this.prompt = this.assignPromptValues(this.getBasePrompt("prompt"), false);

        if (this.client.configuration.bot.information.dm_prompt.length == 0) {
            this.logger.warn("Agent: No DM prompt was provided, using the default prompt.");
            this.dm_prompt = this.prompt;
        } else {
            this.dm_prompt = this.assignPromptValues(this.getBasePrompt("dm_prompt"), false);
        }
        
        this.calculatePromptSize();
    }
    
    private calculatePromptSize() {
        this.logger.trace("Agent: Calculating tokens for the base prompt.");
        const tokens = encode(this.prompt);
        
        this.logger.debug("Agent: Current size of the prompt is", this.logger.color.hex("#7dffbc")(tokens.length), "tokens.");
        if (tokens.length > HARASS_FOR_TOKENS) {
            this.logger.warn("Agent: The current prompt is over", this.logger.color.hex("#7dffbc")(HARASS_FOR_TOKENS), "tokens long, and thus it may run into high costs.");
        }
        
        if (this.dm_prompt != this.prompt) {
            const dm_tokens = encode(this.prompt);

            this.logger.debug("Agent: Current size of the DM prompt is", this.logger.color.hex("#7dffbc")(dm_tokens.length), "tokens.");
            if (dm_tokens.length > HARASS_FOR_TOKENS) {
                this.logger.warn("Agent: The current DM prompt is over", this.logger.color.hex("#7dffbc")(HARASS_FOR_TOKENS), "tokens long, and thus it may run into high costs.");
            }
        }
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

    public assignPromptValues(prompt: string, includeActions: boolean = true, message?: PrimativeMessage): string {
        return Util.handlePromptValues(
            includeActions ? this.handleActionList(prompt) : prompt, message
        );
    }

    public handleActionList(prompt: string): string {
        // TODO: Jesus christ this is a mess
        // upd: still a mess imo but better than it was before

        const allowedDiscordActions = this.client.configuration.bot.ai.discord_actions;
        const allowedActions = this.client.configuration.bot.ai.actions;

        const actions = Object.entries(ActionData)
            .filter(([key]) => allowedActions.includes(key))
            .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`);
        //  ^^^^ this is repeated 3 times, maybe move to a separate function?

        const responses = Object.entries(ActionResponseData)
            .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`);

        const discordActions = allowedActions.includes("discord_action")
            ? Object.entries(DiscordActionData)
                .filter(([key]) => allowedDiscordActions.includes(key))
                .map(([key, data]) => `"${key}" - ${JSON.stringify(data)}`)
            : [];

        const imageActions = [
            "search_images"
        ];

        return Util.replacePlaceholders(prompt, {
            action_list: (
                actions.length > 0 ? [
                    "\n\n%internal.action_perform%",
                    JSON.stringify({
                        type: "action_name",
                        parameters: {
                            parameter_name: "parameter_value"
                        }
                    }),
                    "\n",
                    "%internal.action_list%",
                    ...actions,
                ].join("\n") : "\n"
            ),
            discord_action_list: (
                discordActions.length > 0 ? [
                    "\n\n%internal.discord_action_list%",
                    ...discordActions,
                ].join("\n") : "\n"
            ),
            action_response_list: (
                actions.length > 0 && responses.length > 0 ? [
                    "\n\n%internal.action_response_list%",
                    ...responses,
                    "%internal.math_warning%",
                    "%internal.upload_image_warning%"
                ].join("\n") : "\n"
            ),
            "internal.upload_image_warning": (
                actions.filter(
                    (x) => imageActions.includes(
                        // eslint-disable @typescript-eslint/no-non-null-assertion
                        x.match(/"(.+?)"/)![1]
                    )
                ).length > 0 ? undefined : ""
            ),
            json_format: JSON.stringify({
                username: "%bot_name%",
                text: "your response to the latest message",
                ...(
                    actions.length > 0 ? {
                        action: "the action you want to perform (nullable)"
                    } : {}
                )
            }),
        }).replace(/\n\s/g, "\n");
    }
}
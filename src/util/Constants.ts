import { LogLevel } from "@sapphire/framework";

export enum SourceType {
    OpenAI = "openai",
}

/**
 * All of the available options for the Hikari client, assigned via TOML.
 */
export interface HikariTomlOptions {
    /**
     * Configuration tailored specifically towards the discord bot.
     */
    bot: {
        /**
         * The token it should use to login to discord.
         */
        token: string;

        /**
         * The logging level to use when logging to the console.
         */
        logging_level: string;

        /**
         * Any intents that should be enabled for the bot.
         */
        intents: string[];

        /**
         * The amount of messages that should be cached.
         * Upon a new message sent, if this limit is reached, the oldest message will be removed from the cache.
         */
        context_memory_limit: number;

        /**
         * Whether this bot should respond to direct messages.
         */
        enable_dms: boolean;

        /**
         * Information correlating to the AI, such as the name and prompts.
         */
        information: {
            /**
             * The bot name to use when preparing the AI prompt.
             */
            bot_name: string;

            /**
             * A custom prompt to use when preparing the AI prompt.
             * This is commonly used to add personality to the bot.
             */
            prompt: string[];

            /**
             * A custom prompt to use when preparing the AI prompt, but for direct messages.
             * This is commonly used to add extra special personality to the bot.
             */
            dm_prompt: string[];
        };

        /**
         * If enabled, events will only be listened to if they are in the whitelist given the channel ID.
         */
        whitelist: {
            /**
             * Whether whitelisting is enabled.
             */
            enabled: boolean;

            /**
             * The channels that should be whitelisted.
             */
            channels: string[];

            /**
             * The users that should be whitelisted.
             */
            users: string[];
        };

        /**
         * If enabled, events will be ignored if they are in the blacklist given the channel ID.
         */
        blacklist: {
            /**
             * Whether blacklisting is enabled.
             */
            enabled: boolean;

            /**
             * Whether blacklisting should only apply to direct messages.
             */
            blacklist_only_dms: boolean;

            /**
             * The channels that should be blacklisted.
             */
            channels: string[];

            /**
             * The users that should be blacklisted.
             */
            users: string[];
        }

        ai: {

            /**
             * The model to use when generating a response.
             * Models highly depends on what LLM source you're using. Make sure to check the documentation for the source you're using.
             * Models also available depends on what proxies you have access to.
             */
            model: string;

            /**
             * What source of the LLM you would like to use.
             * This pairs in hand with the model option.
             */
            source: SourceType;

            actions: string[];
            discord_actions: string[];
        }

        /**
         * Special API keys that are used when the AI is trying to access specific APIs.
         */
        keys: {
            /**
             * The API key for the Saucenao API.
             * This is used when the AI is trying to find the source of an image.
             * 
             * Obtainable from https://saucenao.com/user.php
             */
            saucenao: string;

            /**
             * The API key for the Wolfram Alpha API.
             * This is used when the AI is trying to answer a mathematical question or equation.
             * 
             * Obtainable from https://products.wolframalpha.com/api
             */
            wolfram_alpha: string;

            /**
             * The API key for the OpenAI API.
             * This is used when we're not using a proxy, and used when the AI is trying to generate a response to a message.
             * 
             * Obtainable from https://platform.openai.com/
             */
            openai: string;
        };
    };

    /**
     * Proxy options, for avoiding the OpenAI costs.
     */
    proxy: {

        /**
         * Whether the proxy should be allowed to log prompts.
         * This is usually set to true to prevent proxies from snooping on our prompts.
         * 
         * Certain proxies omit the field entirely, and so you'll need to exercise sufficient caution
         * when using one.
         * 
         * Be careful, fellow developer.
         */
        no_loggers: boolean;

        /**
         * Whether we should be using a proxy.
         */
        use_proxy: boolean;

        /**
         * A list of proxies URLs that we should use.
         * The bot will choose the best proxy to use, and will fallback to the next one if it fails. 
         */
        // todo: make that comment true ^
        preferred_proxies: string[];

        /**
         * Some proxies require an API key to be used. List them here if you have any.
         */
        keys: Record<string, string>;
    };

    /**
     * The logging options for the bot.
     */
    logger: {
        /**
         * The logging level to use when logging to the console.
         * 
         * @see {LogLevel}
         */
        level: LogLevel;
    }
}
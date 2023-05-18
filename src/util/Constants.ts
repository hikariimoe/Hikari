import { LogLevel } from "@sapphire/framework";

// TODO: Document these lol
export interface HikariTomlOptions {
    bot: {
        token: string;
        logging_level: string;
        intents: string[];
        context_memory_limit: number;
        information: {
            bot_name: string;
            prompt: string[];
            dm_prompt: string[];
        };

        whitelist: {
            enabled: boolean;
            channels: string[];
            users: string[];
        };

        blacklist: {
            enabled: boolean;
            blacklist_only_dms: boolean;
            channels: string[];
            users: string[];
        }

        keys: {
            saucenao: string;
            wolfram_alpha: string;
            openai: string;
        };
    };

    proxy: {
        model: string;
        no_loggers: boolean;
        use_proxy: boolean;
        preferred_proxies: string[];

        keys: Record<string, string>;
    };

    logger: {
        level: LogLevel;
    }
}
import { LogLevel } from "@sapphire/framework";

export interface HikariTomlOptions {
    bot: {
        token: string;
        logging_level: string;
        intents: string[];
        context_memory_limit: number;
        information: {
            bot_name: string;
            prompt: string[];
        }

        keys: {
            saucenao: string;
        }
    };

    proxy: {
        model: string;
        no_loggers: boolean;
        preferred_proxies: string[];
    };

    logger: {
        level: LogLevel;
    }
}
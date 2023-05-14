import { LoggerFormatOptions } from "@sapphire/plugin-logger";

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
    };

    proxy: {
        model: string;
        no_loggers: boolean;
        preferred_proxies: string[];
    };
}
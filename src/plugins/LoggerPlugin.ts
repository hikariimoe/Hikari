import { Plugin, preGenericsInitialization, SapphireClient } from "@sapphire/framework";
import type { ClientOptions } from "discord.js";
import { Hikari } from "../Hikari";
import { Logger } from "../util/Logger";

export class LoggerPlugin extends Plugin {
    public static [preGenericsInitialization](this: SapphireClient, options: ClientOptions) {
        options.logger ??= {};
        options.logger.instance = new Logger(this as Hikari);
    }
}
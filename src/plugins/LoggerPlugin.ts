import { Plugin, SapphireClient, preGenericsInitialization } from "@sapphire/framework";
import { Logger } from "../util/Logger";
import { Hikari } from "../Hikari";

import type { ClientOptions } from "discord.js";

export class LoggerPlugin extends Plugin {
    public static [preGenericsInitialization](
        this: SapphireClient,
        options: ClientOptions
    ) {
        options.logger ??= {};
        options.logger.instance = new Logger(this as Hikari);
    }
}
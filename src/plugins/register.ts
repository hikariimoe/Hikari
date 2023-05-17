import { preGenericsInitialization } from "@sapphire/framework";
import { LoggerPlugin } from "./LoggerPlugin";
import { Hikari } from "../Hikari";

Hikari.plugins.registerPreGenericsInitializationHook(
    LoggerPlugin[preGenericsInitialization],
    "Logger-PreGenericsInitialization"
);

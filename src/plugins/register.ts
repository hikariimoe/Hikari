import { preGenericsInitialization } from "@sapphire/framework";
import { Hikari } from "../Hikari";
import { LoggerPlugin } from "./LoggerPlugin";

Hikari.plugins.registerPreGenericsInitializationHook(LoggerPlugin[preGenericsInitialization], "Logger-PreGenericsInitialization")
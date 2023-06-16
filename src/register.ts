import { preGenericsInitialization } from "@sapphire/framework";
import { LoggerPlugin } from "./sapphire/LoggerPlugin";
import { Ayame } from "./Ayame";

Ayame.plugins.registerPreGenericsInitializationHook(
    LoggerPlugin[preGenericsInitialization],
    "Logger-PreGenericsInitialization"
)
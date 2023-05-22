import { HikariTomlOptions } from "./src/util/Constants";
import { GatewayIntentBits } from "discord.js";
import { readFile } from "fs/promises";
import { Hikari } from "./src/Hikari";
import toml from "toml";

import "./src/plugins/register";
import { copyFileSync, existsSync } from "fs";

// MAIN ASYNC LOOP
// ESM modules support top-level await,
// but we are not using them because
// typescript does not like ESM.

// I don't either.
void async function main () {
    // Pre-initialize the bot.
    preInit();

    const config: HikariTomlOptions = toml.parse(
        await readFile("./config.toml", "utf-8")
    ) as HikariTomlOptions;

    // Create the client then login.
    const client = new Hikari({
        intents: config.bot.intents.map(
            (intent) => GatewayIntentBits[intent as keyof typeof GatewayIntentBits]
        ), ...config
    }, config as HikariTomlOptions);

    await client.login();
} ();

function preInit() {
    // Check if the config file exists, and if not; copy the example config.
    // This is done to prevent the user from having to manually copy the example config.
    if (!existsSync("./config.toml")) {
        copyFileSync("./config.example.toml", "./config.toml");
    }
}
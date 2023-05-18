import { HikariTomlOptions } from "./src/util/Constants";
import { GatewayIntentBits } from "discord.js";
import { readFile } from "fs/promises";
import { Hikari } from "./src/Hikari";
import toml from "toml";

import "./src/plugins/register";

// MAIN ASYNC LOOP
// ESM modules support top-level await,
// but we are not using them because
// typescript does not like ESM.

// I don't either.
void async function main () {
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

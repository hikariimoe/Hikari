import { Hikari } from "./src/Hikari";
import toml from "toml";
import fs from "fs";
import { HikariTomlOptions } from "./src/util/Constants";
import { GatewayIntentBits } from "discord.js";

// Plugins
import "./src/plugins/register";

// MAIN ASYNC LOOP
// ESM modules support top-level await,
// but we are not using them because
// typescript does not like ESM.

// I don't either.
(async () => {
    // Parse the toml file first.
    let tomlFile: HikariTomlOptions;
    try {
        tomlFile = toml.parse(fs.readFileSync("./config.toml", "utf-8")) as HikariTomlOptions;
    } catch (e) {
        console.error("Failed to parse config.toml file.");
        console.error(e);

        return process.exit(1);
    }

    // Create the client then login.
    const client = new Hikari({
        intents: tomlFile.bot.intents.map((intent) => GatewayIntentBits[intent as keyof typeof GatewayIntentBits])
    }, tomlFile as HikariTomlOptions);

    await client.login();
})();
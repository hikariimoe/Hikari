import { SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { ActionStore } from "./stores/ActionStore";
import { HikariTomlOptions } from "./util/Constants";
import { SourceStore } from "./stores/SourceStore";
import { getRootData } from "@sapphire/pieces";
import { Logger } from "./util/Logger";
import { Partials } from "discord.js";
import { join as pjoin } from "path";
import { Agent } from "./ai/Agent";
import { PluginStore } from "./stores/PluginStore";

type SapphireOptionsWithIntents = SapphireClientOptions & {
    intents: number | number[]
};

export class Hikari extends SapphireClient {
    private rootData = getRootData();
    private _agent?: Agent;

    public configuration: HikariTomlOptions;
    public logger: Logger;

    constructor(
        options: SapphireOptionsWithIntents = { intents: [] },
        configuration: HikariTomlOptions
    ) {
        super({
            ...options,
            partials: [
                Partials.Channel
            ]
        });

        this.stores.register(
            new ActionStore()
                .registerPath(pjoin(this.rootData.root, "actions"))
        );
        this.stores.register(
            new SourceStore()
                .registerPath(pjoin(this.rootData.root, "sources"))
        );

        this.stores.register(
            new PluginStore()
                .registerPath(pjoin(this.rootData.root, "plugins"))
        );

        this.configuration = configuration;
        this.logger = new Logger(this);
    }

    get agent() {
        // eslint-disable @typescript-eslint/no-non-null-assertion
        return this._agent!;
    }

    async login(_?: string) {
        await this.stores.get("sources").loadAll();
        await this.stores.get("actions").loadAll();

        // Create the agent.
        this._agent = new Agent(this);
        this._agent.loadPrompts();
        await this._agent.attemptSetProxy();

        return super.login(this.configuration.bot.token);
    }
}
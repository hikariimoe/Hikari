import { SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { InstructionStore } from "./stores/InstructionStore";
import { HikariTomlOptions } from "./util/Constants";
import { getRootData } from "@sapphire/pieces";
import { Logger } from "./util/Logger";
import { join as pjoin } from "path";
import { Agent } from "./ai/Agent";
import { Partials } from "discord.js";
import { SourceStore } from "./stores/SourceStore";

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
            new InstructionStore()
                .registerPath(pjoin(this.rootData.root, "instructions"))
        )
        this.stores.register(
            new SourceStore()
                .registerPath(pjoin(this.rootData.root, "sources"))
        );

        this.configuration = configuration;
        this.logger = new Logger(this);
    }

    get agent() {
        return this._agent!;
    }

    async login(_?: string) {
        await this.stores.get("sources").loadAll();
        await this.stores.get("instructions").loadAll();

        // Create the agent.
        this._agent = new Agent(this);
        await this._agent.attemptSetProxy();

        return super.login(this.configuration.bot.token);
    }
}
import { SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { InstructionStore } from "./stores/InstructionStore";
import { HikariTomlOptions } from "./util/Constants";
import { getRootData } from "@sapphire/pieces";
import { Logger } from "./util/Logger";
import { join as pjoin } from "path";
import { Agent } from "./ai/Agent";

type SapphireOptionsWithIntents = SapphireClientOptions & {
    intents: number | number[]
};

export class Hikari extends SapphireClient {
    private rootData = getRootData();
    
    public configuration: HikariTomlOptions;
    public agent: Agent;
    public logger: Logger;

    constructor(
        options: SapphireOptionsWithIntents = { intents: [] },
        configuration: HikariTomlOptions
    ) {
        super(options);

        this.configuration = configuration;
        this.logger = new Logger(this);
        this.agent = new Agent(this);

        this.stores.register(
            new InstructionStore()
                .registerPath(pjoin(this.rootData.root, "instructions"))
        );
    }

    async login(_?: string) {
        // Create the agent.
        await this.agent.attemptSetProxy();
        this.agent.create();

        return super.login(this.configuration.bot.token);
    }
}
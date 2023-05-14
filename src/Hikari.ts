import { SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { Agent } from "./ai/Agent";
import { HikariTomlOptions } from "./util/Constants";
import { join } from "path";
import { Logger } from "./util/Logger";
import { InstructionStore } from "./stores/InstructionStore";
import { getRootData } from "@sapphire/pieces";

type SapphireOptionsWithIntents = SapphireClientOptions & { intents: number | number[] };


export class Hikari extends SapphireClient {
    private rootData = getRootData();
    
    public configuration: HikariTomlOptions;
    public agent: Agent;
    public logger: Logger;

    constructor(options: SapphireOptionsWithIntents = { intents: [] }, tomlOptions: HikariTomlOptions) {
        super(options);

        this.configuration = tomlOptions;
        this.logger = new Logger(this);
        this.agent = new Agent(this);

        this.stores
            .register(new InstructionStore().registerPath(join(this.rootData.root, "instructions")));
    }

    async login(_?: string) {
        // Create the agent.
        await this.agent.attemptSetProxy();
        this.agent.create();

        return super.login(this.configuration.bot.token);
    }
}
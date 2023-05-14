import { SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { Agent } from "./ai/Agent";
import { HikariTomlOptions } from "./util/Constants";
import { Logger } from "./util/Logger";

type SapphireOptionsWithIntents = SapphireClientOptions & { intents: number | number[] };


export class Hikari extends SapphireClient {
    public configuration: HikariTomlOptions;
    public agent: Agent;
    public logger: Logger;

    constructor(options: SapphireOptionsWithIntents = { intents: [] }, tomlOptions: HikariTomlOptions) {
        super(options);

        this.configuration = tomlOptions;
        this.logger = new Logger(this);
        this.agent = new Agent(this);
    }

    async login(_?: string) {
        // Create the agent.
        await this.agent.attemptSetProxy();
        this.agent.create();

        return super.login(this.configuration.bot.token);
    }
}
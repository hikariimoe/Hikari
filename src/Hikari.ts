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
        await this.agent.attemptSetProxy();

        this.agent.create();

        const completion = await this.agent.ai?.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "system",
                content: this.agent.prompt
            },
            {
                role: "user",
                content: JSON.stringify({
                    username: "Irisu",
                    text: "could you search up the definition of the word owo for me?"
                })
            }]
        });

        console.log(completion?.data.choices);

        return "e";

        //return super.login(token);
    }
}
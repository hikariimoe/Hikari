import { Logger } from "../../util/Logger";
import { Ayame } from "../../Ayame";
import { AIConnector } from "./AIConnector";
import { Context } from "../Context";

enum EventRoleType {
    System = "system",
    User = "user",
    Assistant = "assistant",
    Function = "function"
}

export interface Prompt {
    role: EventRoleType;
    name: string;
    content?: string;
    call?: {
        name?: string;
        args?: any;
    };
}

export interface SourceResponse {
    content?: string;
    data?: any;
}

export abstract class AISource<T extends AIConnector<unknown> = AIConnector<unknown>> {
    public client: Ayame;
    public logger: Logger;
    public connector: T;

    get assistant() {
        return this.client.assistant;
    }

    constructor(client: Ayame, name: string, connector: T) {
        this.logger = new Logger(client, { title: name });
        this.client = client;
        this.connector = connector;
    }


    public async start() {
        this.connector.connect();
    }

    public stop() {
        this.connector.disconnect();
    }
    
    public abstract respond(prompts: Prompt[], context: Context): Promise<SourceResponse>;
}
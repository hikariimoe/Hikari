import { Logger } from "../../util/Logger";
import { Ayame } from "../../Ayame";

export abstract class AIConnector<T> {
    connected: boolean = false;
    config?: T;

    protected logger: Logger;
    protected client: Ayame;

    constructor(client: Ayame, name: string) {
        this.logger = new Logger(client, { title: name });
        this.client = client;
    }
    
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
} 
import { Events, PluginHook, SapphireClient, SapphireClientOptions } from "@sapphire/framework";
import { getRootData } from "@sapphire/pieces";
import { Partials } from "discord.js";
import { Assistant } from "./assistant/Assistant";
import { ContextManager } from "./managers/ContextManager";
import { AyameTomlOptions } from "./util/Constants";
import { Logger } from "./util/Logger";
import { AISource } from "./structures/ai/AISource";
import { OpenAISource } from "./assistant/sources/OpenAISource";
import { join } from "path";
import { ActionStore } from "./stores/ActionStore";
import { SourceStore } from "./stores/SourceStore";

type SapphireOptionsWithIntents = SapphireClientOptions & {
    intents: number | number[];
}

export class Ayame extends SapphireClient {
    private rootData = getRootData();
    public config: AyameTomlOptions;
    public logger: Logger;

    public assistant: Assistant;
    public contexts: ContextManager;
    public source?: AISource;
    
    constructor(
        options: SapphireOptionsWithIntents = { intents: [] },
        configuration: AyameTomlOptions
    ) {
        super({
            ...options,
            partials: [
                Partials.Channel
            ]
        });

        this.config = configuration;
        this.logger = new Logger(this);
        this.contexts = new ContextManager(this);
        this.assistant = new Assistant(this);

        this.stores.register(
            new ActionStore()
                .registerPath(join(this.rootData.root, "actions"))
        );

        this.stores.register(
            new SourceStore()
                .registerPath(join(this.rootData.root, "actions"))
        );
    }

    public async login(token?: string): Promise<string> {
        this.source = new OpenAISource(this);
        this.source.start();
        
        return super.login(token);
    }
}
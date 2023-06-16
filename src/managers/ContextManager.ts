import { DataManager, ChannelResolvable, TextBasedChannel, Client, Collection } from "discord.js";
import { Ayame } from "../Ayame";
import { FunctionBasedContext } from "../contexts/FunctionBasedContext";
import { Context } from "../structures/Context";

export class ContextManager extends DataManager<string, Context, ChannelResolvable>  {
    declare public client: Ayame;

    private _cache: Collection<string, Context>;
    
    constructor(client: Ayame) {
        super(client as Client<boolean>, Context);
        this._cache = new Collection();
    }

    public get cache(): Collection<string, Context> {
        return this._cache
    }

    public get(channel: TextBasedChannel): Context {
        if (!this.cache.get(channel.id)) {
            // Create a new context for the channel
            // based on the source type.
            const client = this.client
            const sourceName = client.config.bot.ai.source;

            if (sourceName === "openai") {
                // Create a new function-based context.
                this._add(new FunctionBasedContext(client.source!, channel));
            } else {
                throw new Error(`Unknown source type: ${sourceName}`);
            }

            client.logger.info(`Created a new context for channel ${channel.id}`);
        }

        return this.cache.get(channel.id)!;
    }
    
    private _add(data: Context): void {
        this.cache.set(data.channel.id, data);
    }
}
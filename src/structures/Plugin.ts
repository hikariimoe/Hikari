import { Piece, container } from "@sapphire/framework";
import { Message } from "discord.js";
import { Hikari } from "../Hikari";
import { Logger } from "../util/Logger";
import { Util } from "../util/Util";
import { AsyncEventFunction, EventFunction } from "./decorators/Event";
import { HikariContainer } from "./HikariContainer";

export interface PluginOptions extends Piece.Options {
}

export interface PluginManifest {
    name: string;
    version: string;
    authors: string[];

    meta?: {
        logger?: {
            name: string;
        }
    }
}

export interface PluginContainer {
    client: Hikari;
    plugin: Plugin;
}

export class Plugin<O extends PluginOptions = PluginOptions> extends Piece<O> {
    public events: Map<string, (EventFunction | AsyncEventFunction)[]> = new Map();

    public get container(): HikariContainer {
        return container as HikariContainer;
    }

    public static container: PluginContainer;

    public logger: Logger;
    public manifest: PluginManifest;

    constructor(context: Piece.Context, options: O = {} as O) {
        super(context, options);

        this.logger = new Logger(this.container.client, {
            title: this.name
        });

        this.manifest = {} as any;
    }

    emit(event: string, ...args: any[]) {
        if (!this.events.has(event)) {
            return;
        }

        for (const listener of this.events.get(event)!) {
            listener(...args);
        }
    }

    async emitAsync(event: string, ...args: any[]) {
        if (!this.events.has(event)) {
            return;
        }

        for (const listener of this.events.get(event)!) {
            await listener(...args);
        }
    }

    loadEvents() {
        let methods: Set<string | symbol> = new Set();
        let obj: object | null = this;

        while (obj = Reflect.getPrototypeOf(obj)) {
          let keys = Reflect.ownKeys(obj)
          keys.forEach((k) => methods.add(k));
        }

        for (const method of methods) {
            if (method == "constructor") {
                // Ignore the constructor of the plugin.
                continue;
            }

            if (Util.isEventFunction((this as any)[method as string]) || Util.isAsyncEventFunction((this as any)[method as string])) {
                const event = (this as any)[method as string].event.name


                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }

                this.events.get(event)?.push((this as any)[method as string]);
            } 
        }
    }

    loadManifest(manifest: PluginManifest) {
        this.manifest = manifest;

        this.logger.options.title = manifest.meta?.logger?.name ?? this.name;
    }

    load() {
        return;
    }
}

// this looks hyperactively ugly holy shit
export declare namespace Plugin {
    type Options = PluginOptions;
    type Context = Piece.Context;
}
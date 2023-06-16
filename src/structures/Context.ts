import { Message, TextBasedChannel, GuildBasedChannel } from "discord.js";
import { AISource } from "./ai/AISource";
import { Util } from "../util/Util";
import { OrderedSet } from "../util/OrderedSet";

export enum EventRoleType {
    System = "system",
    User = "user",
    Assistant = "assistant",
    Function = "function"
}

export interface Event {
    role: EventRoleType;
    name: string;
    content?: string;
    data?: any;
    call?: string;
}

export abstract class Context {
    public source: AISource;
    public channel: TextBasedChannel;
    public prompt: string;
    public events: OrderedSet<Event>;

    constructor(source: AISource, channel: TextBasedChannel) {
        this.source = source;
        this.channel = channel;
        this.events = new OrderedSet();
        this.prompt = this.handlePrompt();
    }

    public abstract handle(message: Message): Promise<void>;

    /**
     * Adds an event to the set.
     * @param event The event to add to the set
     */
    public add(event: Event): void {
        this.events.add(event);
    }

    /**
     * Removes a number of events from the set.
     * @param count The number of events to remove
     * @param end Whether to remove items from the start or end of the set
     */
    public remove(count: number, end: boolean = false): void {
        let events = Array.from(this.events);
        let removed = 0;

        if (!end) {
            for (let i = 0; i < count; i++) {
                this.events.delete(events[i]);
                removed++;
            }
        } else {
            for (let i = events.length - 1; i >= 0; i--) {
                this.events.delete(events[i]);
                removed++;

                if (removed === count) {
                    break;
                }
            }
        }
    }

    public purge(max: number): void {
        if (this.events.size > max) {
            this.remove(this.events.size - max, false);
        }
    }

    public async parseMessage(message: Message): Promise<Event> {
        return {
            role: EventRoleType.User,
            name: message.author.username,
            content: message.content,
            data: {}
        };
    }

    /**
     * Replaces all placeholders in the prompt with the appropriate values based off channel context.
     * @param message The message to replace placeholders with.
     */
    public handlePrompt(): string {
        let channelName = this.channel.isDMBased()
            ? `DM with ${this.channel.recipient?.username}`
            : (this.channel as GuildBasedChannel).name;

        let channelPrompt = this.channel.isDMBased()
            ? this.source.client.assistant.placeholders.channels.dm
            : this.source.client.assistant.placeholders.channels.public;

        let promptToHandle = this.channel.isDMBased()
            ? this.source.client.assistant.base_prompts.dm
            : this.source.client.assistant.base_prompts.main;
        
        let prompt = Util.handlePlaceholders(promptToHandle, {
            channel: {
                name: channelName
            },
            bot: {
                name: this.source.client.config.bot.information.bot_name
            },
            internal: {
                channel: {
                    prompt: channelPrompt
                }
            }
        });

        return this.source.assistant.fixPrompt(prompt);
    }

    public sanitize(content: string): string {
        if (content.startsWith(`${this.source.assistant.name}:`)) {
            // Remove the assistant's name from the response
            content = content.slice(`${this.source.assistant.name}:`.length).trim();
        }

        return content;
    }
}
import { Context, ContextEvent } from "./Context";
import { Message } from "discord.js";

export interface Memory {
    user: string;
    data: string[];
}

export class ContextMemory {
    private userMemories: Map<string, string[]>;

    constructor(
        private context: Context
    ) {
        this.userMemories = new Map();
    }

    public get(key: string): any {
        let memory = this.userMemories.get(key);
        this.context.agent.logger.trace(`ContextMemory: Getting memory for \"${key}\"`, ": ", memory);

        return memory;
    }

    public set(key: string, value: string): void {
        if (!this.userMemories.has(key))
            this.userMemories.set(key, []);

        this.userMemories.get(key)!.push(value);
        this.context.agent.logger.debug(`ContextMemory: Setting memory for \"${key}\"`, ": ", value);
    }

    public remove(key: string, value?: string): void {
        if (!value) {
            this.userMemories.delete(key);
            this.context.agent.logger.debug(`ContextMemory: Removing memory for ${key}`);
        } else if (this.userMemories.has(key)) {
            const memories = this.userMemories.get(key);

            if (!memories)
                return;
            
            memories.splice(memories.indexOf(value), 1);
            this.context.agent.logger.debug(`ContextMemory: Removing memory for \"${key}\"`, ": ", value);
        }
    }

    public handle(event: ContextEvent, message: Message): string[] | void {
        if (!event.memory)
            return;

        if (!event.memory.user) {
            event.memory.user = message.author.username;
        }

        if (event.memory.out) {
            if (Array.isArray(event.memory.out)) {
                for (const memory of event.memory.out) {
                    this.remove(event.memory.user, memory);
                }
            } else {
                this.remove(event.memory.user, event.memory.out);
            }
        }

        if (event.memory.in) {
            if (Array.isArray(event.memory.in)) {
                // huh.
                // this is a weird one.
                for (const memory of event.memory.in) {
                    this.set(event.memory.user, memory);
                }
            } else {
                this.set(event.memory.user, event.memory.in);
            }
        } else {
            return this.get(event.memory.user);
        }
    }
}

/**
 * "memory": {
 *      "in": "the thing you want to save to your memories",
 *      "out": "the data you want to remove from your memories",
 *      "user": "when using in, this is the user you want to add memories for; otherwise it'll return the memories you have with this user"
 * }
 */
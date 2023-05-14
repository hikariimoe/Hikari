import { Message, TextBasedChannel } from "discord.js";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai";
import { Task } from "../structures/ai/Task";
import { Util } from "../util/Util";
import { Agent } from "./Agent";

export interface ContextEvent {
    text?: string;
    username?: string;
    thoughts?: string;
    attempts: number;
    action?: Task;
}

/**
 * An instance of a Discord channel, with context of everything that has happened in it.
 */
export class Context {
    public channel: TextBasedChannel;

    public agent: Agent;

    public events: Set<ContextEvent>;

    constructor(agent: Agent, channel: TextBasedChannel) {
        this.agent = agent;
        this.channel = channel;
        this.events = new Set();

        this.parse();
    }

    async handle(message: Message, event?: ContextEvent): Promise<ContextEvent | undefined> {
        if (!event) {
            event = {
                text: message.content,
                username: message.author.username,
                attempts: 0,
            };
        }

        let role: ChatCompletionRequestMessageRoleEnum;
        if (!event.username) {
            role = "system"
        } else if (event.username == this.agent.name) {
            role = "assistant";
        } else {
            role = "user";
        }

        event.attempts++;

        if (event.attempts > 5) {
            this.events.add(event);
            this.agent.client.logger.error(["Couldn't properly handle a response to the message", message.id, "after 5 attempts"]);
            return undefined;
        }

        const prompts: ChatCompletionRequestMessage[] = [];
        this.events.forEach((val) => {
            let eventRole: ChatCompletionRequestMessageRoleEnum;
            if (!val.username) {
                eventRole = "system"
            } else if (val.username == this.agent.name) {
                eventRole = "assistant";
            } else {
                eventRole = "user";
            }

            prompts.push(
                {
                    role: eventRole,
                    content: JSON.stringify(Util.omit(val, ["attempts"]))
                })
        })

        prompts.push({
            role: role,
            content: JSON.stringify(Util.omit(event, ["attempts"]))
        })

        const completion = await this.agent.ai?.createChatCompletion({
            model: this.agent.model,
            messages: [{
                role: "system",
                content: this.agent.prompt
            }, ...prompts]
        });

        // Attempt to parse the json
        const json = this.tryParse(completion?.data.choices[0].message?.content);

        if (!json) {
            // Malformed json.
            // TODO: attempt a fix.
            if (event.attempts == 0) {
                
            this.agent.client.logger.error(["Couldn't properly handle a response to the message", message.id, " so we will attempt doing so again."]);
            }
            return this.handle(message, event);
        }

        console.log(this.agent.client.stores.get("instructions"))
        console.log(json)

        if (json.action) {
            const instructionHandler = this.agent.client.stores.get("instructions").find(x => x.taskType == json.action.type);

            if (instructionHandler) {
                this.events.add(event);
                this.events.add(json as ContextEvent);
                
                const postEvent = await instructionHandler.handle(json as ContextEvent, this);

                if (postEvent) {
                    postEvent.attempts = 0;


                    return this.handle(message, postEvent);
                }
            } else {
                // Invalid action.
            }
        }

        this.events.add(event);
        this.events.add(json as ContextEvent);

        if (this.events.size > this.agent.client.configuration.bot.context_memory_limit) {
            let toRemove = this.events.size - this.agent.client.configuration.bot.context_memory_limit
            
            let removed = 0;
            for (let event of this.events.values()) {
                if (removed == toRemove) {
                    break;
                }

                this.events.delete(event);

                removed += 1;
            }
        }

        return json as ContextEvent;
    }

    private tryParse(json?: string) {
        try {
            return JSON.parse(json || "");
        } catch (e) {
            return undefined;
        }
    }

    private parse() {

    }
}
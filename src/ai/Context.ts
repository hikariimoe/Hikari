import { Message, TextBasedChannel } from "discord.js";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai";
import { Task, TaskType } from "../structures/ai/Task";
import { Util } from "../util/Util";
import { Agent } from "./Agent";

export interface ContextEvent {
    text?: string;
    username?: string;
    thoughts?: string;
    attempts: number;
    actions?: Task[];
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
                actions: this.parseMessage(message)
            };
        }

        if (event.attempts == 0) {
            this.agent.logger.debug("Agent: Handling context", this.agent.logger.color.hex("#7dffbc")(message.channel.id), "for message", this.agent.logger.color.hex("#7dffbc")(message.id));
            this.agent.logger.debug("Agent: Event data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(event)));
        }

        let role: ChatCompletionRequestMessageRoleEnum;
        if (!event.username) {
            role = "system"
        } else if (event.username == this.agent.name) {
            role = "assistant";
        } else {
            role = "user";
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
        });

        const completion = await this.agent.ai?.createChatCompletion({
            model: this.agent.model,
            messages: [{
                role: "system",
                content: this.agent.prompt
            }, ...prompts]
        });

        this.agent.logger.trace("Agent: AI response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "has been generated.");
        this.agent.logger.debug("Agent: Response data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(completion?.data)));

        // Attempt to parse the json
        const json = this.tryParse(completion?.data.choices[0].message?.content);



        if (event.attempts > 5) {
            this.events.add(event);
            this.agent.logger.error("Couldn't properly handle a response to the message", this.agent.logger.color.hex("#7dffbc")(message.id), "after 5 attempts");
            return undefined;
        }

        if (!json) {
            // Malformed json.
            // TODO: attempt a fix.
            if (event.attempts == 0) {
                this.agent.client.logger.error("Couldn't properly handle a response to the message", this.agent.logger.color.hex("#7dffbc")(message.id), "so we will attempt doing so again.");
            }

            this.agent.logger.trace("Agent: Attempt", this.agent.logger.color.hex("#ffcb7d")(event.attempts), "of 5 at fixing the json for message", this.agent.logger.color.hex("#7dffbc")(message.id))

            return this.handle(message, event);
        }

        this.agent.logger.debug("Agent: Response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "successfully generated.");
        this.agent.logger.debug("Agent: Event data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(json)));

        this.events.add(event);
        this.events.add(json as ContextEvent);

        if (Array.isArray(json.actions) && json.actions.length > 0) {
            this.agent.logger.debug("Agent: Response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "had instructions attached to it");
            this.agent.logger.debug("Agent: Instruction data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(json.actions)));
            this.agent.logger.trace("Agent: Attempting to find a proper instruction handler to read them all.");
            let sent = false;

            for (let action of json.actions) {
                const instructionHandler = this.agent.client.stores.get("instructions").find(x => x.taskType == action.type);

                if (instructionHandler) {
                    if (sent == false) {
                        sent = true;
                        message.channel.send(json.text)
                    }
                    this.agent.logger.trace("Agent: Proper instruction handler found.");

                    const postEvent = await instructionHandler.handle(message, action as Task, this);

                    if (postEvent) {
                        this.agent.logger.debug("Agent: Instruction handler created a post event, so we're handling it now.");
                        this.agent.logger.debug("Agent: Instruction response data: ", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(postEvent)));
                        postEvent.attempts = 1;
                        await this.handle(message, postEvent);
                    } else {
                        this.agent.logger.debug("Agent: Instruction handler returned no data, so continuing on normally.");
                    }

                    sent = true;
                } else {
                    // Invalid action.
                    this.agent.logger.warn("Agent: An instruction was provided by the AI, but there is no instruction handler that supports it!");
                    this.agent.logger.warn("Agent: instruction data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(action)));
                }
            }

            if (sent == true) {
                return;
            }
        }

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
        
        if (json.text) {
            message.channel.send(json.text);
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

    private parseMessage(message: Message): Task[] {
        const actions: Task[] = [];

        return actions;
    }

    private parse() {
        this.agent.logger.trace("Agent: Parsing the last", this.agent.logger.color.hex("#7dffbc")(this.agent.client.configuration.bot.context_memory_limit), "messages in the channel");
    }
}
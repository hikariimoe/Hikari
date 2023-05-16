import { Message, TextBasedChannel } from "discord.js";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateChatCompletionResponse } from "openai";
import { Task, TaskType } from "../structures/ai/Task";
import { Util } from "../util/Util";
import { Agent } from "./Agent";
import { jsonrepair } from 'jsonrepair'
import type { AxiosResponse } from "axios"; // imagine having to import an entire request framework just for a type

export interface ContextEvent {
    text?: string;
    username?: string;
    thoughts?: string;
    attempts: number;
    action?: Task;
}

export const IgnoreTaskTypes: TaskType[] = [];

/**
 * An instance of a Discord channel, with context of everything that has happened in it.
 */
export class Context {
    public channel: TextBasedChannel;

    public agent: Agent;

    public events: Set<ContextEvent>;

    public ratelimited: boolean = false;

    public currentMessage: Message | undefined;

    constructor(agent: Agent, channel: TextBasedChannel) {
        this.agent = agent;
        this.channel = channel;
        this.events = new Set();

        this.parse();
    }

    async handleCompletion(prompts: ChatCompletionRequestMessage[]): Promise<string> {
        return await new Promise(async (resolve, reject) => {
            let completionStream: any;
            try {
                completionStream = await this.agent.ai?.createChatCompletion({
                    model: this.agent.model,
                    stream: true,
                    messages: [{
                        role: "system",
                        content: this.agent.prompt
                    }, ...prompts]
                }, {
                    responseType: "stream"
                });
            } catch (e: any) {
                if (e.response && e.response.status === 429) {
                    this.ratelimited = true;
                    let until = parseInt(e.response.headers["x-ratelimit-reset"]) - Date.now();

                    const rl = await this.currentMessage?.reply(`I'm being rate limited, please wait ${until}ms for a response, or try again later (wont read any messages until then)`);

                    this.agent.logger.warn("Agent: Rate limited, waiting", this.agent.logger.color.hex("#7dffbc")(until), "ms");

                    setTimeout(async() => {
                        this.ratelimited = false;

                        await rl?.delete();
                        resolve(await this.handleCompletion(prompts));
                    }, until);
                }
            }

            let result = "";
            // @ts-ignore
            // don't think there's a type for this lol 
            completionStream?.data.on("data", (data: Buffer) => {
                let values = data.toString().split("\n")
                    .filter((line) => line.trim() !== "");

                for (let value of values) {
                    if (value.startsWith("data: ")) {
                        value = value.replace("data: ", "");
                    }

                    // trim newlines
                    if (value === "[DONE]") {
                        // @ts-ignore
                        completionStream?.data.destroy();
                        resolve(result);

                        break;
                    }

                    let json = JSON.parse(value);

                    if (json.choices) {
                        json.choices.forEach((choice: any) => {
                            if (choice.delta.content) {
                                result += choice.delta.content;
                            }
                        });
                    }
                }

            })
        })
    }

    async handle(message: Message, event?: ContextEvent, toEdit?: Message): Promise<ContextEvent | undefined> {
        if (this.ratelimited) {
            return;
        }

        this.currentMessage = message;

        if (!event) {
            event = {
                text: message.content,
                username: message.author.username,
                attempts: 0,
                action: this.parseMessage(message)
            };
        }

        if (event?.action && IgnoreTaskTypes.includes(event.action.type)) {
            // TODO: 
            return;
        }

        if (event.attempts === 0) {
            this.agent.logger.debug("Agent: Handling context", this.agent.logger.color.hex("#7dffbc")(message.channel.id), "for message", this.agent.logger.color.hex("#7dffbc")(message.id));
            this.agent.logger.debug("Agent: Event data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(event)));
        }


        let role: ChatCompletionRequestMessageRoleEnum;
        if (!event.username) {
            role = "system";
        } else if (event.username === this.agent.name) {
            role = "assistant";
        } else {
            role = "user";
        }

        const prompts: ChatCompletionRequestMessage[] = [];
        this.events.forEach((val) => {
            let eventRole: ChatCompletionRequestMessageRoleEnum;
            if (!val.username) {
                eventRole = "system";
            } else if (val.username === this.agent.name) {
                eventRole = "assistant";
            } else {
                eventRole = "user";
            }

            prompts.push(
                {
                    role: eventRole,
                    content: JSON.stringify(Util.omit(val, ["attempts"]))
                });
        });

        prompts.push({
            role: role,
            content: JSON.stringify(Util.omit(event, ["attempts"]))
        });

        let completion = await this.handleCompletion(prompts);

        this.agent.logger.trace("Agent: AI response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "has been generated.");
        this.agent.logger.debug("Agent: Response data:", this.agent.logger.color.hex("#ff7de3")(completion));

        // Attempt to parse the json
        let json = this.tryParse(completion);

        if (json.action == "undefined") {
            json.action = undefined;
        }

        if (event.attempts > 5) {
            this.events.add(event);
            this.agent.logger.error("Agent: Couldn't properly handle a response to the message", this.agent.logger.color.hex("#7dffbc")(message.id), "after 5 attempts");
            return undefined;
        }

        if (!json) {
            // Malformed json.
            if (event.attempts === 0) {
                this.agent.client.logger.error("Agent: Couldn't properly handle a response to the message", this.agent.logger.color.hex("#7dffbc")(message.id), "so we will attempt doing so again.");
            }

            this.agent.logger.trace("Agent: Attempt", this.agent.logger.color.hex("#ffcb7d")(event.attempts), "of 5 at fixing the json for message", this.agent.logger.color.hex("#7dffbc")(message.id));

            try {
                const repaired = jsonrepair(completion);
                json = this.tryParse(repaired);

                if (!json) {
                    this.agent.logger.error("Agent: JSON repair failed for response to message", this.agent.logger.color.hex("#7dffbc")(message.id));
                    return this.handle(message, event);
                }

                if (Array.isArray(json)) {
                    // why is this even possible?
                    let objBuilder: any = {};

                    json.forEach((val) => {
                        if (val.username) {
                            objBuilder = {
                                ...val
                            }
                        } else if (val.type) {
                            objBuilder.action = val;
                        }
                    });
                }

                this.agent.logger.error("Agent: JSON repair apparently succeeded, continuing on.");
            } catch (err) {
                this.agent.logger.error("Agent: JSON repair failed for response to message", this.agent.logger.color.hex("#7dffbc")(message.id));
                return undefined;
            }

        }

        this.agent.logger.debug("Agent: Response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "successfully generated.");
        this.agent.logger.debug("Agent: Event data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(json)));

        this.events.add(event);
        this.events.add(json as ContextEvent);

        if (json.action) {
            this.agent.logger.debug("Agent: Response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "had an instruction attached to it");
            this.agent.logger.debug("Agent: Instruction data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(json.action)));
            this.agent.logger.trace("Agent: Attempting to find a proper instruction handler to read them all.");
            let sent = false;

            const instructionHandler = this.agent.client.stores.get("instructions").find(x => x.taskType === json.action.type);

            if (instructionHandler) {
                if (!sent) {
                    sent = true;

                    if (json.text && json.text.length > 0 && json.text !== "") {
                        if (toEdit) {
                            toEdit.edit(json.text || "(empty response)");
                        } else {
                            message.reply(json.text || "(empty response)");
                        }
                    }
                }

                this.agent.logger.trace("Agent: Proper instruction handler found.");
                const postEvent = await instructionHandler.handle(message, json.action as Task, this);

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
                this.agent.logger.warn("Agent: instruction data:", this.agent.logger.color.hex("#ff7de3")(JSON.stringify(json.action)));
            }

            if (sent) {
                return;
            }
        }

        if (this.events.size > this.agent.client.configuration.bot.context_memory_limit) {
            const toRemove = this.events.size - this.agent.client.configuration.bot.context_memory_limit;

            let removed = 0;
            for (const event of this.events.values()) {
                if (removed === toRemove) {
                    break;
                }

                this.events.delete(event);

                removed += 1;
            }
        }

        if (json.text && json.text.length > 0 && json.text !== "") {
            if (toEdit) {
                toEdit.edit(json.text || "(empty response)");
            } else {
                message.reply(json.text || "(empty response)");
            }
        }

        this.currentMessage = undefined;

        return json as ContextEvent;
    }

    private tryParse(json?: string) {
        try {
            return JSON.parse(json ?? "");
        } catch (e) {
            return undefined;
        }
    }

    private parseMessage(_message: Message): Task | undefined {
        return undefined;
    }

    private parse() {
        this.agent.logger.trace("Agent: Parsing the last", this.agent.logger.color.hex("#7dffbc")(this.agent.client.configuration.bot.context_memory_limit), "messages in the channel");
    }
}
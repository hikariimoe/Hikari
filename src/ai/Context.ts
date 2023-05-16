import { Message, TextBasedChannel } from "discord.js";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateChatCompletionResponse } from "openai";
import { Task, TaskType } from "../structures/ai/Task";
import { Util } from "../util/Util";
import { Agent } from "./Agent";
import { jsonrepair } from 'jsonrepair'
import type { AxiosResponse } from "axios"; // imagine having to import an entire request framework just for a type
import { match } from "assert";

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

    public handling: boolean = false;

    public currentMessage: Message | undefined;

    constructor(agent: Agent, channel: TextBasedChannel) {
        this.agent = agent;
        this.channel = channel;
        this.events = new Set();

        this.parse();
    }

    async handleCompletion(prompts: ChatCompletionRequestMessage[], sendReply: boolean = false, model: string = this.agent.model): Promise<string> {
        return await new Promise(async (resolve, reject) => {
            let completionStream: any;
            try {
                completionStream = await this.agent.ai?.createChatCompletion({
                    model: model,
                    stream: true,
                    messages: prompts
                }, {
                    responseType: "stream"
                });
            } catch (e: any) {
                if (e.response && e.response.status === 429) {
                    this.ratelimited = true;
                    let until = parseInt(e.response.headers["x-ratelimit-reset"]) - Date.now();

                    let rl: Message | undefined;
                    if (sendReply == true) {
                        rl = await this.currentMessage?.reply(`I'm being rate limited, please wait ${until}ms for a response, or try again later (wont read any messages until then)`);
                    }

                    this.agent.logger.warn("Agent: Rate limited, waiting", this.agent.logger.color.hex("#7dffbc")(until), "ms");

                    setTimeout(async () => {
                        this.ratelimited = false;

                        await rl?.delete();
                        resolve(await this.handleCompletion(prompts, sendReply ? false : sendReply, model));
                    }, until);
                }
            }

            let result = "";
            let sentQueueMessage = false;
            let queueMessage: Message | undefined;
            // @ts-ignore
            // don't think there's a type for this lol 
            completionStream?.data.on("data", async (data: Buffer) => {
                if (data.includes("queue")) {
                    // Well Fuck
                    if (sentQueueMessage == false && sendReply == true) {
                        queueMessage = await this.currentMessage?.reply(`(enqueued request, please wait for a response~)`);
                        sentQueueMessage = true;
                    }

                    return;
                }

                let values = data.toString().split("\n")
                    .filter((line) => line.trim() !== "");

                for (let value of values) {
                    if (value.startsWith("data: ")) {
                        value = value.replace("data: ", "");
                    }

                    // trim newlines
                    if (value === "[DONE]") {
                        // @ts-ignore
                        if (sentQueueMessage == true) {
                            await queueMessage?.delete();
                        }

                        completionStream?.data.destroy();
                        resolve(result);

                        break;
                    }

                    let json;
                    try {
                        json = JSON.parse(value);
                    } catch (e) {
                        completionStream?.data.destroy();
                        reject(result);

                        break;
                    }

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
        if (!event) {
            event = await this.parseMessage(message);
        }
        
        if (this.ratelimited || this.handling) {
            this.events.add(event);
            return;
        }

        this.currentMessage = message;
        this.handling = true;


        // return;

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

        const prompts: ChatCompletionRequestMessage[] = [{
            role: "system",
            content: this.agent.prompt
        }];
        
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

        let completion: string;
        try {
            completion = await this.handleCompletion(prompts, true);
        } catch (e) {
            this.agent.logger.error("Agent: A response to the message", this.agent.logger.color.hex("#7dffbc")(message.id), "couldn't be generated, and encountered a critical problem.");
            this.agent.logger.error("Agent: Malformed result data:", this.agent.logger.color.hex("#ff7de3")(e));

            // We'll have to retry this one.
            event.attempts++;
            return this.handle(message, event);
        }

        // Attempt to parse the json
        let json = this.tryParse(completion);

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
                    return await this.handle(message, event);
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

        if (json.action && typeof json.action === "string") {
            json.action = undefined;
        }

        this.agent.logger.trace("Agent: AI response to message", this.agent.logger.color.hex("#7dffbc")(message.id), "has been generated.");
        this.agent.logger.debug("Agent: Response data:", this.agent.logger.color.hex("#ff7de3")(completion));

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
            let content = json.text;

            // Get mentions from the message.
            // they're @Username, so we need to convert them to <@ID>
            const regex = /@(\w+)/;

            let matches = regex.exec(content);
            
            while (matches) {
                const user = this.agent.client.users.cache.find(x => x.username === matches?.[1]);

                if (user) {
                    content = content.replace(new RegExp(`@${user.username}`), `<@${user.id}>`);
                }

                matches = regex.exec(content);
            }

            if (toEdit) {
                toEdit.edit(content);
            } else {
                message.reply(content);
            }
        }

        this.currentMessage = undefined;
        this.handling = false;

        return json as ContextEvent;
    }

    private tryParse(json?: string) {
        try {
            return JSON.parse(json ?? "");
        } catch (e) {
            return undefined;
        }
    }

    private async parseMessage(message: Message): Promise<ContextEvent> {
        let event: ContextEvent = {
            text: message.content,
            username: message.author.username,
            attempts: 0
        };

        // Filter mentions into usernames.
        if (message.mentions.users.size > 0) {
            // Parse <@!123456789> into @username
            const regex = /<@!?(\d+)>/g;
            let matches = message.content.match(regex);

            if (matches) {
                matches.forEach((match) => {
                    const id = match.replace(/<@!?(\d+)>/, "$1");
                    const user = message.mentions.users.get(id);

                    if (user) {
                        event.text = event.text?.replace(match, `@${user.username}`);
                    }
                });
            }
        }

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();

            if (attachment?.name.endsWith(".png") || attachment?.name.endsWith(".jpg") || attachment?.name.endsWith(".jpeg")) {
                this.agent.logger.debug("Agent: Message", this.agent.logger.color.hex("#7dffbc")(message.id), "contains an image, so we're going to try to parse it.");

                let url = new URL("https://saucenao.com/search.php");
                url.search = new URLSearchParams({
                    api_key: this.agent.client.configuration.bot.keys.saucenao,
                    db: "999",
                    output_type: "2",
                    url: attachment.url
                }).toString();

                let naoResponse = await fetch(url, { method: "GET" });

                if (naoResponse.status !== 200) {
                    // todo: handle this?
                    return event;
                }

                let resJson = await naoResponse.json();
                let sortedResults = resJson.results.sort((a: any, b: any) => parseFloat(b.header.similarity) - parseFloat(a.header.similarity));
                let first = sortedResults[0];

                let similarity = parseFloat(first.header.similarity);
                let finalString = "";

                if (similarity >= 90 && first.data != null) {
                    let tags = await this.getTags(attachment.url, attachment.name);
                    finalString = await this.handleCompletion([{
                        role: "system",
                        content: this.agent.getPrompt("image_curator_prompt")
                    }, {
                        role: "user",
                        content: `${JSON.stringify(first.data)}${tags.length > 0 ? `\n\n${tags.join(", ")}` : ""}`
                    }], false, "gpt-3.5-turbo"); // Enforce gpt-3.5 because gpt-4 is expensive and this ain't rly that bulky of a request tbh

                } else {
                    let tags = await this.getTags(attachment.url, attachment.name);

                    if (tags.length > 0) {
                        finalString = await this.handleCompletion([{
                            role: "system",
                            content: this.agent.getPrompt("image_curator_prompt")
                        }, {
                            role: "user",
                            content: tags.join(", ")
                        }], false, "gpt-3.5-turbo"); // Enforce gpt-3.5 because gpt-4 is expensive and this ain't rly that bulky of a request tbh
                    }
                }

                event.action = {
                    type: TaskType.UploadImage,
                    parameters: {
                        query: finalString
                    }
                }
            } else {
                event.action = {
                    type: TaskType.UploadImage,
                    parameters: {
                        query: "You are unsure what this image is, as you can't find any characters or source material, or tell what it is."
                    }
                }
            }

            return event;
        }

        return event;
    }

    private async getTags(url: string, filename: string) {
        this.agent.logger.debug("Agent: Getting tags for image", this.agent.logger.color.hex("#7dffbc")(url));

        let image = await fetch(url, { method: "GET" });

        let formData = new FormData();
        formData.append("format", "json");
        formData.append("file", await image.blob(), filename);

        let resp = await (await fetch("https://autotagger.donmai.us/evaluate", {
            method: "POST",
            body: formData
        })).json();

        let tags = [];

        for (const tag of Object.keys(resp[0].tags)) {
            if (tag.startsWith("rating:"))
                continue;

            let tagSimilarity = resp[0].tags[tag];

            if (tagSimilarity >= 0.5)
                tags.push(tag);
        }

        return tags;
    }

    private parse() {
        this.agent.logger.trace("Agent: Parsing the last", this.agent.logger.color.hex("#7dffbc")(this.agent.client.configuration.bot.context_memory_limit), "messages in the channel");
    }
}
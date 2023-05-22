import { Source, Prompt } from "../src/structures/Source";
import { SourceType } from "../src/util/Constants";
import { Agent } from "../src/ai/Agent";
import { SourceError, SourceErrorType, SourceErrorData } from "../src/util/errors/SourceError";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai";

export class OpenAISource extends Source {
    constructor(context: Source.Context) {
        super(context, {
            name: "openai",
            title: "OpenAISource",
            type: SourceType.OpenAI
        });

        console.log("cock");
    }

    async prompt(prompts: Prompt[], model?: string): Promise<string | Promise<string>> {
        // TODO: we should NOT be handling the OpenAI source here.
        //       The OpenAI source should be handled in this class instead.
        const { client: { agent, configuration } } = this.container;

        model ??= configuration.bot.ai.model ?? "gpt-3.5-turbo";

        return await new Promise(async (resolve, reject) => {
            this.logger.debug("Creating AI completion request for", this.logger.color.hex("#7dffbc")(prompts.length), "prompts");
            let completionStream: any;

            try {
                let cleanPrompts = prompts.map((p) => {
                    return {
                        content: p.content,
                        role: p.role as ChatCompletionRequestMessageRoleEnum
                    } satisfies ChatCompletionRequestMessage
                })

                completionStream = (await agent.ai?.createChatCompletion({
                    model: model ?? "gpt-3.5-turbo",
                    stream: true,
                    messages: cleanPrompts
                }, {
                    responseType: "stream"
                }));
            } catch (e: any) {
                if (e.response && e.response.status === 429) {
                    const until = parseInt(e.response.headers["x-ratelimit-reset"]) - Date.now();

                    this.logger.warn("Rate limited, waiting", this.logger.color.hex("#ff7de3")(until), "ms.");
                    return reject(new SourceError(SourceErrorType.Ratelimited, { until }));
                }

                console.log(e);
            }

            let result = "";
            let resolve2: any;
            let reject2: any;
            let queued = false;

            completionStream?.data.on("data", async (data: Buffer) => {
                const queue = {
                    resolve: (value: string) => {
                        queued == true ? resolve2(value) : resolve(value);
                    },

                    reject: (error: SourceError | undefined) => {
                        queued == true ? reject2(error) : reject(error);
                    }
                }
                
                let values = data.toString().split("\n")
                    .filter((line) => line.trim() !== "");

                    console.log(data.toString());

                for (let value of values) {
                    if (value.startsWith("data: ")) {
                        value = value.replace("data: ", "");
                    }

                    if (value.includes("queue")) {
                        if (queued == false) {
                            queued = true;

                            resolve(new Promise((res, rej) => {
                                resolve2 = res;
                                reject2 = rej;
                            }));
                        }
                        continue;
                    }

                    if (value === "[DONE]") {
                        // check if we've sent the queue message, and delete it if it exists
                        if (result.includes("upstream error")) {
                            if (result.includes("server_error")) {
                                this.logger.error("The OpenAI API is currently experiencing major issues, so we can't continue.")
                                this.logger.error("Please try again later, or contact the developer if this issue persists.");

                                return reject(new SourceError(SourceErrorType.InternalError, {
                                    message: "The OpenAI API is currently experiencing major issues, so we can't continue."
                                }));
                            }

                            return queue.reject(undefined);
                        }

                        this.logger.trace("Request has been completed, returning result.");

                        completionStream?.data.destroy();
                        return queue.resolve(result);
                    }

                    let json: any;

                    try {
                        json = JSON.parse(value);
                    } catch (e: any) {
                        completionStream?.data.destroy();
                        console.log(value);
                        return queue.reject(new SourceError(SourceErrorType.MalformedResponse, {
                            data: e.message
                        }));
                    }

                    this.logger.trace("Received completion data:", this.logger.color.hex("#ff7de3")(JSON.stringify(json)));

                    if (json.choices) {
                        json.choices.forEach((choice: any) => {
                            if (choice.delta.content) {
                                result += choice.delta.content;
                            }
                        })
                    }
                }
            })
        });
    }
}
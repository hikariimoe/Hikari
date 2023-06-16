
import { Message } from "discord.js";
import { AISource, Prompt, SourceResponse } from "../../structures/ai/AISource";
import { OpenAIConnector } from "../connectors/OpenAIConnector";
import { Ayame } from "../../Ayame";
import { Context, EventRoleType } from "../../structures/Context";
import { ActionHandlePriority } from "../../structures/Action";

export class OpenAISource extends AISource<OpenAIConnector> {
    public constructor(client: Ayame) {
        super(client, "OpenAI", new OpenAIConnector(client));
    }

    public override async respond(prompts: Prompt[], context: Context, functionCall?: string): Promise<SourceResponse> {
        let model = this.client.config.bot.ai.model ?? "gpt-3.5-turbo";

        try {
            const actions = this.client.stores.get("actions");

            let completion = (await this.connector.ai.createChatCompletion({
                model,
                functions: actions.size > 0 ? actions.map(action => {
                    return {
                        name: action.type,
                        body: action.description,
                        parameters: action.parameters
                    };
                }) : undefined,
                messages: [
                    {
                        role: "system",
                        content: context.prompt
                    },
                    ...prompts.map((x) => ({
                        role: x.role,
                        name: x.name,
                        content: x.content,
                        function_call: x.call
                    }))
                ],
                function_call: functionCall ? functionCall : (actions.size > 0 ? "auto" : "undefined")
            }, {
                responseType: "text"
            }));

            const data = completion.data.choices[0].message;

            if (data?.function_call) {
                const actionHandler = actions.find((action) => action.type === data?.function_call?.name);

                console.log(data)

                if (!actionHandler) {
                    // Recomplete the message without the function call, and return the response
                    return this.respond(prompts, context, "none");
                }

                if (actionHandler?.priority == ActionHandlePriority.DuringMessage) {
                    // Generate a response without a function call
                    const completion = await this.respond(prompts, context, "none");

                    // Modify the latest event to include the function call
                    const latestEvent = context.events.last();

                    if (latestEvent) {
                        latestEvent.call = data.function_call.name;
                    }


                    // Run the action
                    const response = await actionHandler.run(JSON.parse(data?.function_call?.arguments ?? "{}"), context);

                    return {
                        content: completion.content,
                        data: response
                    };
                } else if (actionHandler?.priority == ActionHandlePriority.BeforeMessage) {
                    const response = await actionHandler.run(JSON.parse(data?.function_call?.arguments ?? "{}"), context);

                    // Add the response & assistant response to the context
                    context.add({
                        role: EventRoleType.Assistant,
                        name: this.assistant.name,
                        content: undefined,
                        call: actionHandler.type
                    });

                    context.add({
                        role: EventRoleType.Function,
                        name: actionHandler.type,
                        content: JSON.stringify(response)
                    });

                    // Add them to the prompts next

                    prompts.push(
                        {
                            role: EventRoleType.Assistant,
                            name: this.assistant.name,
                            content: undefined,
                            call: data.function_call
                        },
                        {
                            role: EventRoleType.Function,
                            name: actionHandler.type,
                            content: JSON.stringify(response)
                        }
                    );

                    // Recomplete the message with the function call, and return the response
                    return this.respond(prompts, context, functionCall);
                }
            }

            // Add the response & assistant response to the context
            context.add({
                role: EventRoleType.Assistant,
                name: this.assistant.name,
                content: context.sanitize(data?.content ?? ""),
                call: functionCall,
            });

            return {
                content: context.sanitize(data?.content ?? ""),
            }
        } catch (e: any) {
            console.dir(e.response.data);
        }

        return {};
    }
}


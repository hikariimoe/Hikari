import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import { WolframAlphaProvider } from "../providers/WolframAlphaProvider";
import { Task, TaskType } from "../src/structures/ai/Task";
import { ContextEvent } from "../src/ai/Context";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";

export class SearchWolframAlphaInstruction extends Instruction {
    private wolfram: WolframAlphaProvider;

    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchWolframAlpha
        });

        this.wolfram = new WolframAlphaProvider(context);
    }

    async handle(_trigger: Message, event: Task): Promise<ContextEvent | undefined> {
        try {
            const result = await this.wolfram.query(event.parameters.query);

            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        type: TaskType.SearchWolframAlpha,
                        result
                    }
                }
            }
        } catch (_) {
            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        type: TaskType.SearchWolframAlpha,
                        response: null
                    }
                }
            }
        }
    }
}
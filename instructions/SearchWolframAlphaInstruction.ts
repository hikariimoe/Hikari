import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import { WolframAlphaProvider } from "../providers/WolframAlphaProvider";

export class SearchWolframAlphaInstruction extends Instruction {
    private wolfram: WolframAlphaProvider;

    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchWolframAlpha
        });

        this.wolfram = new WolframAlphaProvider(context);
    }

    async handle(_trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        try {
            let result = await this.wolfram.query(event.parameters.query);

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
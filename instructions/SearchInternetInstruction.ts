import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";
import { Context, ContextEvent } from "../src/ai/Context";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import google from "googlethis";
import { Util } from "../src/util/Util";

export class SearchWebInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchWeb
        });
    }

    async handle(_trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        const results = await google.search(event.parameters.query, {
            page: 0,
            parse_ads: false,
        });

        return {
            attempts: 0,
            action: {
                type: TaskType.InternetResults,
                parameters: Util.shrink(results)
            }
        }
    }
}
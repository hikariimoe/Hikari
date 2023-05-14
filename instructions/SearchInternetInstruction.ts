import { Piece } from "@sapphire/pieces";
import { Context, ContextEvent } from "../src/ai/Context";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Instruction, InstructionOptions } from "../src/structures/Instruction";

export class SearchWebInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchWeb
        })
    }

    async handle(event: ContextEvent, context: Context): Promise<ContextEvent | undefined> {
        console.log(event)
        console.log(context.events)
        return;
    }
}
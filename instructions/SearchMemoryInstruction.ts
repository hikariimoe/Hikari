import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";

export class SearchMemoryInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchMemory
        });
    }

    async handle(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        if (!event.parameters.user)
            return undefined;

        return {
            attempts: 0,
            action: {
                type: TaskType.ActionResponse,
                parameters: {
                    action: TaskType.SearchMemory,
                    user: event.parameters.user,
                    memories: context.memories.get(event.parameters.user)
                }
            }
        };
    }
}
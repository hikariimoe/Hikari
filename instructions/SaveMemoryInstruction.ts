import { PrismaClient } from "@prisma/client";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";
import { Context, ContextEvent } from "../src/ai/Context";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Instruction, InstructionOptions } from "../src/structures/Instruction";

const prisma = new PrismaClient();

export class SaveMemoryInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SaveMemory
        })
    }

    async handle(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        if (!event.parameters.data) {
            return undefined;
        }

        const memory = prisma.memory.create({
            data: {
                user_id: trigger.author.id,
                data: event.parameters
            }
        }) 
        return;
    }
}
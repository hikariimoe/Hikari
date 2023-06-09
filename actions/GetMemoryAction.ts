import { Action, ActionOptions } from "../src/structures/Action";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import { PrismaClient } from "@prisma/client";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";

const prisma = new PrismaClient();

export class GetMemoryAction extends Action {
    constructor(context: Piece.Context, options: ActionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.GetMemory
        });
    }

    async handle(trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        const memories = await prisma.memory.findMany({
            where: {
                channel_id: trigger.channel.id
            }
        });

        return {
            attempts: 0,
            action: {
                type: TaskType.MemoryData,
                parameters: {
                    query: event.parameters.query,
                    memories
                }
            }
        };
    }
}
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
            taskType: TaskType.DeleteMessage
        });
    }

    async handle(trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        let currentEvent = this.getLastValue(_context.events);
        let response = "";
        let deleted = true;

        // delete the message
        try {
            const message = await trigger.channel.messages.fetch(event.parameters.message_id);

            if (message) {
                if (!message.deletable) {
                    response = `You do not have permission to delete this message.`;
                    deleted = false;
                } else {
                    await message.delete();
    
                    response = `The message has successfully been deleted.`;
                    deleted = true;
                }
            }
        } catch (e) {
            response = `The message could not be deleted.`;
            deleted = false;
        }

        // find the message in the context
        // if it exists, delete it
        if (deleted == true) {
            for (let ev of _context.events) {
                if (ev.message_id === event.parameters.message_id) {
                    _context.events.delete(ev);
                    break;
                }
            }
        }

        if (!currentEvent?.text || deleted == false) {
            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        action: TaskType.DeleteMessage,
                        response: response
                    }
                }
            };
        } else {
            // Return nothing, because the response is already in the context.
            return undefined;
        }
    }

    getLastValue<T>(set: Set<T>): T | undefined {
        let value;
        for (value of set);
        return value;
    }

}
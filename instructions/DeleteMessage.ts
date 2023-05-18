import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";

export class SaveMemoryInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.DeleteMessage
        });
    }

    async handle(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        const currentEvent = this.getLastValue(context.events);
        let response = "";
        let deleted = true;

        try {
            const message = await trigger.channel.messages.fetch(event.parameters.message_id);

            if (message) {
                if (!message.deletable) {
                    response = `You do not have permission to delete this message.`;
                    deleted = false;
                } else {
                    response = `The message has successfully been deleted.`;

                    await message.delete();
                    for (const ev of context.events) {
                        if (ev.message_id === event.parameters.message_id) {
                            context.events.delete(ev);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            response = `The message could not be deleted.`;
            deleted = false;
        }

        if (!currentEvent?.text || !deleted) {
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
        }
    }

    getLastValue<T>(set: Set<T>): T | undefined {
        return [...set.values()].at(-1);
    }
}
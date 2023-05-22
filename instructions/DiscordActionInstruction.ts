import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";

enum DiscordAction {
    DeleteMessage = "delete_message",
    ChangeStatus = "change_status"
}

export class SaveMemoryInstruction extends Instruction {
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.DiscordAction
        });
    }

    async handle(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        switch (event.parameters.action) {
            case DiscordAction.DeleteMessage:
                return await this.deleteMessage(trigger, event, context);

            case DiscordAction.ChangeStatus:
                return await this.changeStatus(trigger, event, context);
        }
    }

    private async changeStatus(_: Message, event: Task, __: Context): Promise<ContextEvent | undefined> {
        this.container.client.user?.setActivity({
            name: this.ensureString(event.parameters.value),
        });

        return undefined;
    }

    private async deleteMessage(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        let response = "";

        try {
            console.log(this.ensureString(event.parameters.value));
            const message = await trigger.channel.messages.fetch({
                message: this.ensureString(event.parameters.value),
                
            });
            
            await message.delete();
            for (const ev of context.events) {
                if (ev.message_id === event.parameters.value) {
                    context.events.delete(ev);
                    break;
                }
            }

            response = "The message was successfully deleted.";
        } catch (e) {
            response = "The message could not be deleted.";
        }

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

    // TODO: move this to a utility class
    private ensureString(str: string): string {
        try {
            const output = JSON.parse(str);

            return typeof output === "string" ? output : str;
        } catch (e) {
            return str;
        }
    }

    getLastValue<T>(set: Set<T>): T | undefined {
        return [...set.values()].at(-1);
    }
}
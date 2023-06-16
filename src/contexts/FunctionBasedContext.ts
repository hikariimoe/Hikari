import { Message, TextBasedChannel } from "discord.js";
import { ActionHandlePriority } from "../structures/Action";
import { AISource, Prompt } from "../structures/ai/AISource";
import { Context, Event, EventRoleType } from "../structures/Context";
import { Util } from "../util/Util";

/**
 * A context that's based on utilizing OpenAI's API to handle actions.
 */
export class FunctionBasedContext extends Context {
    constructor(source: AISource, channel: TextBasedChannel) {
        super(source, channel);
    }

    public async handle(message: Message<boolean>): Promise<void> {
        await message.channel.sendTyping();

        const event = await this.parseMessage(message);
        const prompts: Prompt[] = [];

        for (const event of this.events) {
            prompts.push({
                role: event.role,
                name: event.name,
                content: this.generateContentFromEvent(event)
            })
        }

        // Add the message to the prompts
        prompts.push({
            role: EventRoleType.User,
            name: message.author.displayName,
            content: this.generateContentFromEvent(event)
        });

        const completion = await this.source.respond(prompts, this);

        console.log(this.events);


        if (completion.content) {
            await message.channel.send(completion.content);
        }
    }

    private generateContentFromEvent(event: Event): string | undefined {
        return event.content
    }
}

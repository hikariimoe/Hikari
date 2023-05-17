/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { isDMChannel } from "@sapphire/discord.js-utilities";
import { Listener } from "@sapphire/framework";
import { Message, PermissionFlagsBits, } from "discord.js";
import { HikariListener } from "../src/structures/HikariListener";
import { Events } from "../src/util/Events";

export class MessageCreateListener extends HikariListener<typeof Events.MessageCreate> {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        await this.processMessage(message);
    }

    private async processMessage(message: Message) {
        if (!await this.canProcessMessage(message)) {
            return;
        }

        let prefix: string | null = null;
        if (this.checkMentionPrefix(message)) {
            prefix = this.checkMentionPrefix(message);
        } else {
            // Check if the message starts with a supported prefix.
            const prefixes = await this.container.client.fetchPrefix(message);
            const prefixFound = this.checkPrefix(message, prefixes);
    
            if (prefixFound) {
                return this.container.client.emit(Events.CommandRun, message, prefixFound);
            }
        }

        if (prefix) {
            if (prefix.length === message.content.length) {
                // The message is just the prefix.
                return;
            }

            return this.container.client.emit(Events.CommandRun, message, prefix);
        }

        /// AI HANDLER
        const ctx = await this.container.client.agent.context(message.channel);
        try {
            await ctx?.handle(message);
        } catch (e) {
            console.log(e);
        }
    }

    private async canProcessMessage(message: Message) {
        if (message.author.bot || isDMChannel(message.channel) || !message.channel.isTextBased())
            return false;

        const me = await message.guild?.members.fetchMe();

        if (!me || !message.channel.permissionsFor(me).has([
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ViewChannel
        ], true)) {
            return false;
        }

        return true;
    }
    
    // https://github.com/sapphiredev/framework/blob/main/src/optional-listeners/message-command-listeners/CorePreMessageParser.ts#LL55-L78C3
    // TODO: Make this better and less ugly.
    private checkMentionPrefix(message: Message): string | null {
		if (this.container.client.disableMentionPrefix) return null;
		// If the content is shorter than 20 characters, or does not start with `<@` then skip early:
		if (message.content.length < 20 || !message.content.startsWith("<@")) return null;

		// Calculate the offset and the ID that is being provided
		const [offset, id] =
			message.content[2] === "&"
				? [3, message.guild?.roles.botRoleFor(this.container.client.id!)?.id]
				: [message.content[2] === "!" ? 3 : 2, this.container.client.id];

		if (!id) return null;

		const offsetWithId = offset + id.length;

		// If the mention doesn"t end with `>`, skip early:
		if (message.content[offsetWithId] !== ">") return null;

		// Check whether or not the ID is the same as the managed role ID:
		const mentionId = message.content.substring(offset, offsetWithId);
		if (mentionId === id) return message.content.substring(0, offsetWithId + 1);

		return null;
	}

    private checkPrefix(message: Message, prefixes: string | readonly string[] | null): string | null {
        if (prefixes === null) {
            // No prefixes were found.
            return null;
        }

        if (typeof prefixes === "string") {
            // Only one prefix was found.
            return message.content.startsWith(prefixes) ? prefixes : null;
        }

		const { caseInsensitivePrefixes } = this.container.client.options;
        return prefixes.find((prefix) => message.content.startsWith(caseInsensitivePrefixes ? prefix.toLowerCase() : prefix)) ?? null;
    }
}
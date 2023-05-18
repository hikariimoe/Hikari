/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Message } from "discord.js";
import { HikariListener } from "../src/structures/HikariListener";
import { isDMChannel } from "@sapphire/discord.js-utilities";
import { Listener } from "@sapphire/framework";
import { Events } from "../src/util/Events";

import type { Hikari } from "../src/Hikari";

export class MessageCreateListener extends HikariListener<typeof Events.MessageCreate> {
    private config = this.container.client.configuration.bot;
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        if (!this.canProcessMessage(message)) {
            return;
        }
    
        const prefixes = await this.container.client.fetchPrefix(message);
        const prefix = this.checkMentionPrefix(message) ?? this.checkPrefix(message, prefixes);
        
        if (prefix && prefix.length != message.content.length) {
            if (message.channel.isDMBased()) {
                return;
            }

            return this.container.client.emit(Events.CommandRun, message, prefix);
        } else {
            if ((message.channel.isDMBased() && !this.config.whitelist.users.includes(message.author.id))
                || message.channel.isDMBased() && this.config.blacklist.users.includes(message.author.id)
                || !message.channel.isDMBased() && !this.config.blacklist.blacklist_only_dms && this.config.blacklist.users.includes(message.author.id)) {
                return;
            }
            if ((this.config.whitelist.enabled == true && !this.config.whitelist.users.includes(message.author.id))
                || this.config.blacklist.channels.includes(message.channel.id)) {
                return;
            }

            // idk if any of the above works

            const ctx = await this.container.client.agent.context(message.channel);

            try {
                await ctx?.handle(message);
            } catch (e) {
                console.log(e);
            }
        }
    }

    private canProcessMessage(message: Message) {
        // Message can be processed if:
        // - the author is not a bot
        // - the message has been created in a guild
        // - the current channel is text-based and not DM-based
        // - the bot has permissions to send messages and view the current channel 
        // Optionally checks if the current channel is whitelisted if the whitelist is enabled.

        if (message.channel.isDMBased()) {
            return true;
        }

        return (
            !message.author.bot
            && message.channel.isTextBased()
            && (
                this.container.client.configuration.bot.whitelist.enabled
                ? this.container.client.configuration.bot.whitelist.channels.includes(message.channel.id)
                : true
            )
        );
    }

    /**
     * Checks if the message starts with a bot's mention. Returns the used prefix or null if didn't match.
     */
    private checkMentionPrefix(message: Message): string | null {
        // TODO: Make this better and less ugly.
        // (its shorter now but still ugly LMAO)
        const mention = message.content.match(/^<@[!&]?(\d+)>/);
        return this.container.client.disableMentionPrefix && mention && (
            mention[1] == this.container.client.id
            || mention[1] == message.guild?.roles.botRoleFor(this.container.client.id!)?.id
        ) ? mention[0] : null;
    }

    /**
     * Checks if the message starts with a provided prefix(es). Returns the matched prefix or null if didn't match.
     */
    private checkPrefix(message: Message, prefixes: string | readonly string[] | null): string | null {
        if (!prefixes) return null;
        if (this.container.client.options.caseInsensitivePrefixes) {
            const content = message.content.toLowerCase();
            return (
                typeof prefixes == "string"
                ? content.startsWith(prefixes.toLowerCase()) && prefixes.toLowerCase()
                : prefixes.find((x) => content.startsWith(x.toLowerCase()))
            ) || null;
        } else {
            return (
                typeof prefixes == "string"
                ? message.content.startsWith(prefixes) && prefixes
                : prefixes.find((x) => message.content.startsWith(x))
            ) || null;
        }
    }
}
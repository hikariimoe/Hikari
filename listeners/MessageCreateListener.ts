import { Listener } from "@sapphire/framework";
import { Message } from "discord.js";
import { Events } from "../src/util/Events";
import { Ayame } from "../src/Ayame"
import { AyameTomlOptions } from "../src/util/Constants";

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
    declare public client: Ayame;
    
    private config: AyameTomlOptions["bot"];
    
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });

        this.client = this.container.client as Ayame;
        this.config = this.client.config.bot;
    }

    public async run(message: Message) {
        if (!this.canProcessMessage(message)) {
            return;
        }

        const prefixes = await this.container.client.fetchPrefix(message);
        const prefix = this.checkMentionPrefix(message) ?? this.checkPrefix(message, prefixes);

        if (prefix && prefix.length !== message.content.length && !message.channel.isDMBased()) {
            return this.container.client.emit(Events.CommandRun, message, prefix);
        }

        // whitelisting dream
        if (this.config.whitelist.enabled && !this.config.whitelist.channels.includes(message.channel.id)) {
            return;
        }

        // blacklisting NIGHTMARE
        // blacklisting is a nightmare for these reasons:
        // 1. users can be blacklisted purely from dming the bot as a setting
        // 2. users can be blacklisted altogether
        // 3. channels can also be blacklisted
        if (this.config.blacklist.enabled && (
            (message.channel.isDMBased() || !this.config.blacklist.blacklist_only_dms)
            && this.config.blacklist.users.includes(message.author.id)
            || this.config.blacklist.channels.includes(message.channel.id)
        )) {
            return;
        }

        try {
            const ctx = this.client.contexts.get(message.channel);
            await ctx?.handle(message);
        } catch (e:any) {
            console.error(e);
        }
    }

    /**
     * Checks if the message can be processed
     */
    private canProcessMessage(message: Message) {
        return !message.author.bot && message.channel.isTextBased();
    }

    /**
     * Checks if the message starts with a bot's mention. Returns the used prefix or null if didn't match.
     */
    private checkMentionPrefix(message: Message): string | null {
        // TODO: Make this better and less ugly.
        // (its shorter now but still ugly LMAO)
        const mention = message.content.match(/^<@[!&]?(\d+)>/);
        return this.container.client.disableMentionPrefix && mention && (
            mention[1] === this.container.client.id
            || mention[1] === message.guild?.roles.botRoleFor(this.container.client.id!)?.id
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
                typeof prefixes === "string"
                ? content.startsWith(prefixes.toLowerCase()) && prefixes.toLowerCase()
                : prefixes.find((x) => content.startsWith(x.toLowerCase()))
            ) || null;
        } else {
            return (
                typeof prefixes === "string"
                ? message.content.startsWith(prefixes) && prefixes
                : prefixes.find((x) => message.content.startsWith(x))
            ) || null;
        }
    }
}
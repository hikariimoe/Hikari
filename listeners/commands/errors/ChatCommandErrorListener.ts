import { ChatInputCommandErrorPayload, Listener } from "@sapphire/framework";
import { EmbedHelper } from "../../../src/util/EmbedHelper";

export class ChatCommandErrorListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: "chatInputCommandError"
        });
    }

    public run(error: Error, payload: ChatInputCommandErrorPayload) {
        if (payload.interaction.isRepliable()) {
            payload.interaction.reply({
                embeds: [
                    EmbedHelper.createErrorEmbed(error)
                ],
                ephemeral: true
            });
        }
    }
}
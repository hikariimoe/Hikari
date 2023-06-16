import { Events, Listener, MessageCommandErrorPayload } from "@sapphire/framework";
import { EmbedHelper } from "../../../src/util/EmbedHelper";

export class MessageCommandErrorListener extends Listener<typeof Events.MessageCommandError> {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCommandError
        });
    }

    public run(error: Error, payload: MessageCommandErrorPayload) {
        payload.message.reply({
            embeds: [
                EmbedHelper.createErrorEmbed(error)
            ]
        });
    }
}
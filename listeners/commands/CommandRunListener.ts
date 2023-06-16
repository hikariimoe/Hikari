import { Listener, MessageCommand, MessageCommandAcceptedPayload, Result } from "@sapphire/framework";
import { Stopwatch } from "@sapphire/stopwatch";
import { Message } from "discord.js";
import { Events } from "../../src/util/Events";

export class CommandRunListener extends Listener<typeof Events.CommandRun> {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.CommandRun
        });
    }

    public async run(message: Message, prefix: string) {
        const { stores } = this.container;
        const { caseInsensitiveCommands } = this.container.client.options;
        
        // Parse the content.
        const content = message.content.slice(prefix.length).trim();

        // Get the command name, and assert it exists.
        const commandName = content.indexOf(" ") === -1 ? content : content.slice(0, content.indexOf(" "));
        if (commandName.length === 0) {
            return;
        }

        const casedCommand = caseInsensitiveCommands ? commandName.toLowerCase() : commandName;
        const command = stores.get("commands").get(casedCommand);
        if (!command || !command.messageRun) {
            return;
        }

        // Run the command.
        await this.runCommand({
            message,
            command: command as MessageCommand,
            parameters: content.indexOf(" ") === -1 ? "" : content.slice(content.indexOf(" ") + 1),
            context: {
                prefix,
                commandName,
                commandPrefix: prefix,
            }
        });
    }

    // https://github.com/sapphiredev/framework/blob/main/src/optional-listeners/message-command-listeners/CoreMessageCommandAccepted.ts#LL11C2-L35C3
    public async runCommand(payload: MessageCommandAcceptedPayload) {
        const { message, command, parameters, context } = payload;
        const args = await command.messagePreParse(message, parameters, context);
        
		const result = await Result.fromAsync(async () => {
			message.client.emit(Events.MessageCommandRun, message, command, { ...payload, args });

			const stopwatch = new Stopwatch();
			const result = await command.messageRun(message, args, context);
			const { duration } = stopwatch.stop();

			message.client.emit(Events.MessageCommandSuccess, { ...payload, args, result, duration });

			return duration;
		});

        result.inspectErr((error) => {
            return message.client.emit(Events.MessageCommandError, error, {
                ...payload,
                args,
                duration: -1
            });
        });
        
        message.client.emit(Events.MessageCommandFinish, message, command, {
			...payload,
			args,
			success: result.isOk(),
			duration: result.unwrapOr(-1)
		});
    }
}
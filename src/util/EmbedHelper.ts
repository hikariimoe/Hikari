import { EmbedBuilder, User } from "discord.js";
import { Colors } from "./Constants";

export class EmbedHelper {
    constructor() {
        throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
    }

    public static createErrorEmbed(error: Error) {
        return new EmbedBuilder()
            .setTitle("An error has occured: " + error.name)
            .setColor(Colors.Failure)
            .setDescription(`A fatal error has occured while running this command!\n\`\`\`${error.stack?.split("\n").slice(0, 3).join("\n")}\`\`\``)
            .setFooter({
                text: "If you are seeing this, that means something has gone very wrong. Please contact the bot developers with this error!"
            });
    }

    public static createLevelEmbed(user: User, level: number) {
        return new EmbedBuilder()
            .setTitle("Congratulations, you leveled up!")
            .setColor(Colors.General)
            .setDescription(`You are now level ${level}!`)
            .setAuthor({
                name: user.tag,
                iconURL: user.displayAvatarURL()
            });
    }
}
import { Logger as BuiltinLogger, LogLevel } from "@sapphire/framework";
import chalk from "chalk";
import type { Hikari } from "../Hikari";

export const LoggerColors = {
    trace: "#d6d6d6",
    debug: "#7e807f",
    info: "#40a373",
    warn: "#ffe494",
    error: "#ff9494",
    fatal: "#a34040",
    none: "#d6d6d6",
}

export const ErrorLevels = [
    "Fatal",
    "Error"
]

export class Logger extends BuiltinLogger {
    public readonly formats: Map<LogLevel, string>

    public constructor(client: Hikari) {
        super(client.options.logger?.level ?? LogLevel.Info);

        this.formats = this.createFormatMap();
    }

    write(level: LogLevel, ...values: readonly unknown[]): void {
        if (this.level > level) {
            return;
        }

        const formatter = this.formats.get(level) ?? this.formats.get(this.level)!;

        console.log(this.preprocess(formatter, values));
    }

    /**
     * An accessor for the chalk module, to provide color support without having to directly import it in every file.
     */
    get color() {
        return chalk;
    }

    private preprocess(format: string, values: readonly unknown[]) {
        // Values to replace
        // - {date} - Date
        // - {values} - Values
        // - {title} - A potential title

        const date = new Date().toISOString();
        const newValues = [...values]; // Fuck you, readonly!

        if (typeof values[0] === "string" && values[0].match(/[a-zA-Z0-9]: /)) {
            const mainValue = values[0].split(": ");
            newValues[0] = mainValue[1];

            format = format.replace("{title}", mainValue[0]);
        } else {
            format = format.replace("{title}", "Bot");
        }


        return format.replace("{date}", date).replace("{values}", newValues.join(" "));

    }

    private createFormatMap() {
        return new Map<LogLevel, string>(Object.keys(LogLevel)
            .map((key) => {
                const enumKey = key as keyof typeof LogLevel;
                const isValueProperty = Number.isNaN(Number(enumKey));

                if (!isValueProperty) {
                    return [LogLevel[key as keyof typeof LogLevel], ""];
                }

                return [LogLevel[key as keyof typeof LogLevel], this.getFormatString(key as keyof typeof LogLevel)]
            }));
    }

    private getFormatString(level: keyof typeof LogLevel) {
        const color = LoggerColors[level.toLowerCase() as keyof typeof LoggerColors];
        const bubbleColor = ErrorLevels.includes(level) ? "#ff6e6e" : "#6eff6e";

        return `${chalk.hex(bubbleColor)("•")} ${chalk.bgHex(color).bold(` ${level.toUpperCase()} `)} ${chalk.hex("#484a49").italic("{date}")} ${chalk.hex("#a4aefc")("{title}")} • ${chalk.hex("#fafafa")("{values}")}`;
    }
}
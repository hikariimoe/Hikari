import { Ayame } from "../Ayame";
import toml from "toml";
import fs from "fs";
import path from "path";
import { Util } from "../util/Util";

interface AssistantPrompts {
    main: string;
    dm: string;
}

// nasty types
// @ts-ignore
type PlaceholderRecord = Record<string, string[] | string | PlaceholderRecord>;

/**
 * A programmatic representation of the AI chatbot used to power the bot.
 */
export class Assistant {
    public client: Ayame;

    public placeholders: PlaceholderRecord = {};
    public base_prompts: AssistantPrompts;

    public functions: Map<string, any>;

    get name() {
        return this.client.config.bot.information.bot_name;
    }

    constructor(client: Ayame) {
        this.client = client;
        this.base_prompts = {
            main: "",
            dm: ""
        };
        
        // Get placeholders from internal & external sources
        this.getPlaceholders();    
        this.constructPrompts();

        this.functions = new Map();
    }

    private constructPrompts() {
        const placeholders = {
            internal: {
                prompts: this.flattenPrompts(this.placeholders.prompts),
                channels: this.flattenPrompts(this.placeholders.channels)
            },
            bot: {
                name: this.client.config.bot.information.bot_name,
            }
        };

        const prompt = this.client.config.bot.information.prompt;
        const dm_prompt = this.client.config.bot.information.dm_prompt;

        if (this.client.config.bot.information.dm_prompt.length == 0) {
            dm_prompt.push(...this.client.config.bot.information.prompt);
        }

        prompt.push("\n%internal.prompts.completion%");
        dm_prompt.push("\n\n%internal.prompts.completion%");

        this.base_prompts.main = this.fixPrompt(Util.handlePlaceholders(prompt.join(" "), placeholders));
        this.base_prompts.dm = this.fixPrompt(Util.handlePlaceholders(dm_prompt.join(" "), placeholders));
    }
    
    private flattenPrompts(prompts: PlaceholderRecord): any {
        for (const key of Object.keys(prompts)) {
            if (Array.isArray(prompts[key])) {
                prompts[key] = (<string[]>prompts[key]).join(" ");
            } else if (typeof prompts[key] === "object") {
                prompts[key] = this.flattenPrompts(<PlaceholderRecord>prompts[key]);
            }
        }

        return prompts;
    }

    public fixPrompt(prompt: string): string {
        // replace \s\n and \n\s with \n
        return prompt.replace(/(\s\n|\n\s)/g, "\n");
    }

    private getPlaceholders() {
        this.client.logger.trace("Loading internal placeholders.");
        const internalPrompts = toml.parse(
            fs.readFileSync(path.join(__dirname, "/../internal_placeholders.toml"), "utf-8")
        );

        this.client.logger.trace("Loading user placeholders.");
        const userPrompts = toml.parse(
            fs.readFileSync(path.join(__dirname, "/../../placeholders.toml"), "utf-8")
        );

        this.placeholders = {
            ...userPrompts,
            ...internalPrompts
        }
    }
}
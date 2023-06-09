import { Action, ActionOptions } from "../src/structures/Action";
import { Task, TaskType } from "../src/structures/ai/Task";
import { ContextEvent } from "../src/ai/Context";
import { Piece } from "@sapphire/pieces";
import { Util } from "../src/util/Util";
import { Message } from "discord.js";
import google from "googlethis";

export class SearchInternetAction extends Action {
    constructor(context: Piece.Context, options: ActionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchWeb
        });
    }

    async handle(_trigger: Message, event: Task): Promise<ContextEvent | undefined> {
        const results = await google.search(event.parameters.query, {
            page: 0,
            parse_ads: false,
        });

        return {
            attempts: 0,
            action: {
                type: TaskType.InternetResults,
                parameters: Util.shrink(results)
            }
        };
    }
}
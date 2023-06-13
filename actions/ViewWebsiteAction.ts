import { Action, ActionOptions } from "../src/structures/Action";
import { Context, ContextEvent } from "../src/ai/Context";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Piece } from "@sapphire/pieces";
import { Util } from "../src/util/Util";
import { Message } from "discord.js";
import { load } from "cheerio";

export class ViewWebsiteAction extends Action {
    constructor(context: Piece.Context, options: ActionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.ViewWebsite
        });
    }

    async handle(_trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        // get the html
        try {
            const res = await fetch(event.parameters?.url);

            if (!res.ok) {
                throw new Error(res.statusText);
            }

            // Lmao
            const $ = load(await res.text());
            $("script").remove();
            $("head").remove();
            $("style").remove();
            $("link").remove();
            $("meta").remove();
            $("noscript").remove();
            $("iframe").remove();
            $("svg").remove();
            $("img").remove();

            const elements: string[] = [];
            $("body").children().each((i, el) => {
                elements.push($(el).html()!);
            });

            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        type: TaskType.ViewWebsite,
                        html: elements
                    }
                }
            }
        } catch (e: any) {
            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        type: TaskType.ViewWebsite,
                        html: e.message
                    }
                }
            }
        }



    }
}
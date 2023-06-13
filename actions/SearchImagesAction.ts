import { Action, ActionOptions } from "../src/structures/Action";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Context, ContextEvent } from "../src/ai/Context";
import Booru, { BooruClass } from "booru";
import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";
import google from "googlethis";

export class SearchImagesAction extends Action {
    private booru: BooruClass;
    constructor(context: Piece.Context, options: ActionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchImages
        });

        this.booru = Booru("gelbooru");
    }

    async handle(_trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        if (event.parameters.type == "gelbooru") {
            const images = await this.booru.search(
                event.parameters.query.split(" "), {
                    limit: typeof event.parameters.limit === "number"
                        ? event.parameters.limit
                        : 5,
                    random: true
                }
            );

            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        action: TaskType.SearchImages,
                        response: {
                            type: "gelbooru",
                            results: images.map((post) => ({
                                id: post.id,
                                url: post.fileUrl,
                                tags: post.tags,
                                rating: post.rating
                            }))
                        }
                    }
                }
            };
        } else if (event.parameters.type == "google") {
            const images = await google.image(event.parameters.query, { safe: true });

            return {
                attempts: 0,
                action: {
                    type: TaskType.ActionResponse,
                    parameters: {
                        action: TaskType.SearchImages,
                        response: {
                            type: "google",
                            results: images.map((post) => ({
                                id: post.id,
                                url: post.url,
                            })).slice(0, typeof event.parameters.limit === "number" ? event.parameters.limit : 1)
                        }
                    }
                }
            }
        }
    }
}
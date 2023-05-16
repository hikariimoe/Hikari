import { Piece } from "@sapphire/pieces";
import { Message } from "discord.js";
import { Context, ContextEvent } from "../src/ai/Context";
import { Task, TaskType } from "../src/structures/ai/Task";
import { Instruction, InstructionOptions } from "../src/structures/Instruction";
import Booru, { BooruClass } from "booru";
import { Util } from "../src/util/Util";

export class SearchWebInstruction extends Instruction {
    private booru: BooruClass;
    constructor(context: Piece.Context, options: InstructionOptions) {
        super(context, {
            ...options,
            taskType: TaskType.SearchImages
        });

        this.booru = Booru("gelbooru");
    }

    async handle(_trigger: Message, event: Task, _context: Context): Promise<ContextEvent | undefined> {
        if(event.parameters.type == "gelbooru") {
            console.log(event.parameters)
            const images  = await this.booru.search(event.parameters.query.split(" "), { limit: typeof event.parameters.limit === "number" ? event.parameters.limit : 5, random: true });

            return {
                attempts: 0,
                action: {
                    type: TaskType.ImageResults,
                    parameters: {
                        type: "gelbooru",
                        results: images.map((post) => {
                            return {
                                id: post.id,
                                url: post.fileUrl,
                                tags: post.tags,
                                rating: post.rating
                            }
                        })
                    }
                }
            }
        }
    }
}
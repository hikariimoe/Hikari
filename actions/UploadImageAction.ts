import { Piece } from "@sapphire/framework";
import { Action, ActionHandlePriority, ActionResponse, ActionType } from "../src/structures/Action";
import { Message } from "discord.js";
import { Context, Event } from "../src/structures/Context";

export class UploadImageAction extends Action {
    constructor(context: Piece.Context) {
        super(context, {
            type: ActionType.UploadImage,
            priority: ActionHandlePriority.DuringMessage,
            description: "Uploads an image to Discord.",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "The URL of the image to upload."
                    }
                }
            }
        })
    }
    
    public override async run(parameters: Record<string, any>, context: Context): Promise<ActionResponse> {
        return {
            uploaded: true
        };
    }
}
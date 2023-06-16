import { Piece, PieceContext, PieceOptions } from "@sapphire/framework";
import { Message } from "discord.js";
import { Context, Event } from "./Context";

export interface ActionResponse {
    [key: string]: any;
}

export enum ActionType {
    Unknown = "unknown",
    UploadImage = "uploadImage",
}

export enum ActionHandlePriority {
    DuringMessage = 0,
    BeforeMessage = 1,
    AfterMessage = 2
}

export abstract class Action<O extends ActionOptions = ActionOptions> extends Piece<O> {
    public type: ActionType;
    public description?: string;
    public parameters?: ObjectParameter;
    public priority: ActionHandlePriority;

    constructor(context: PieceContext, options: O = {
        type: ActionType.Unknown,
    } as O) {
        super(context, options);

        this.type = options.type;
        this.description = options.description;
        this.parameters = options.parameters;
        this.priority = options.priority ?? ActionHandlePriority.AfterMessage;
    }

    public abstract run(parameters: Record<string, any>, context: Context): Promise<ActionResponse>;
}

export interface ActionOptions extends PieceOptions {
    readonly type: ActionType;
    readonly description?: string;
    readonly parameters?: ObjectParameter;
    readonly priority?: ActionHandlePriority;
}

export interface ObjectParameter {
    readonly type: "object";
    readonly properties: Record<string, Property>;
    readonly required?: string[];
}

export type Property = StringProperty;

export interface StringProperty {
    readonly type: "string";
    readonly description?: string;
    readonly enum?: string[];
}

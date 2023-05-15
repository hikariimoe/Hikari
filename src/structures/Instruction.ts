import { Piece, PieceContext } from "@sapphire/pieces";
import { Message } from "discord.js";
import { Context, ContextEvent } from "../ai/Context";
import { Task, TaskType } from "./ai/Task";

export abstract class Instruction<O extends InstructionOptions = InstructionOptions> extends Piece<O> {
    public taskType: TaskType;
    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);

        this.taskType = options.taskType ?? TaskType.Unknown;
    }

    async handle(trigger: Message, event: Task, context: Context): Promise<ContextEvent | undefined> {
        return;
    }
}


export interface InstructionOptions extends Piece.Options {
    readonly taskType?: TaskType;
}
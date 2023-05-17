import { Piece, PieceContext } from "@sapphire/pieces";
import { Context, ContextEvent } from "../ai/Context";
import { Task, TaskType } from "./ai/Task";
import { Message } from "discord.js";

export interface InstructionOptions extends Piece.Options {
    readonly taskType?: TaskType;
}

export abstract class Instruction<O extends InstructionOptions = InstructionOptions> extends Piece<O> {
    public taskType: TaskType;
    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);

        this.taskType = options.taskType ?? TaskType.Unknown;
    }

    async handle(_trigger: Message, _event: Task, _context: Context): Promise<ContextEvent | undefined> {
        return;
    }
}
import { Piece } from "@sapphire/framework";
import type { Ayame } from "../Ayame";
import { SourceType } from "../util/Constants";
import { Logger } from "../util/Logger";

export interface SourceOptions extends Piece.Options {
    title?: string;
    type?: SourceType;
}

export interface Prompt {
    role: string;
    user?: string;
    content: string;
}

export abstract class Source<O extends SourceOptions = SourceOptions> extends Piece<O> {
    public logger: Logger;

    public constructor(context: Piece.Context, options: O = {} as O) {
        super(context, options);

        this.logger = new Logger(this.container.client as Ayame, {
            title: options.title
        });
    }
}
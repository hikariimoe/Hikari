import { container, Piece } from "@sapphire/framework";
import { SourceType } from "../util/Constants";
import { Logger } from "../util/Logger";
import { HikariContainer } from "./HikariContainer";

export interface SourceOptions extends Piece.Options {
    title?: string;
    type?: SourceType;
}

// debating whether this is useful or not kek
// its useful for stricter generic typing but it has no properties so it's useless otherwise
// unfortunately api's vary too much to make a generic prompt interface
export interface Prompt {
    role: string;
    user?: string | undefined;
    content: string;
}

export abstract class Source<O extends SourceOptions = SourceOptions> extends Piece<O> {
    public get container(): HikariContainer {
        return container as HikariContainer;
    }

    public logger: Logger;

    constructor(context: Piece.Context, options: O = {} as O) {
        super(context, options);

        this.logger = new Logger(this.container.client, {
            title: options.title
        })
    }

    abstract prompt(prompts: Prompt[], model?: string): Promise<string | Promise<string>>;
}

// this looks hyperactively ugly holy shit
export declare namespace Source {
    type Options = SourceOptions;
    type Context = Piece.Context;
}
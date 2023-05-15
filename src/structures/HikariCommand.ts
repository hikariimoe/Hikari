import { Args, Command, CommandOptions, PieceContext } from "@sapphire/framework";

export class HikariCommand<PreParseReturn = Args, O extends HikariComandOptions = HikariComandOptions> extends Command<PreParseReturn, O> {
    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);
    }
    
    get container() {
        return super.container;
    }
}

export type HikariComandOptions = CommandOptions
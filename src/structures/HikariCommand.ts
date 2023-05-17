import { Args, Command, CommandOptions, PieceContext } from "@sapphire/framework";

export type HikariComandOptions = CommandOptions;

export class HikariCommand<PreParseReturn = Args, O extends HikariComandOptions = HikariComandOptions> extends Command<PreParseReturn, O> {
    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);
    }
    
    get container() {
        return super.container;
    }
}
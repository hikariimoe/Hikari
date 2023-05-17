import { Instruction } from "../structures/Instruction";
import { Store } from "@sapphire/framework";

export class InstructionStore extends Store<Instruction> {
    constructor() {
        super(Instruction, {
            name: "instructions"
        });
    }
}
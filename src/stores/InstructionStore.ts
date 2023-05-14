import { Store } from "@sapphire/framework";
import { Instruction } from "../structures/Instruction";

export class InstructionStore extends Store<Instruction> {
    constructor() {
        super(Instruction, { name: "instructions" });
    }
}
import { InstructionStore } from "../src/stores/InstructionStore";

declare module "@sapphire/pieces" {
    interface StoreRegistryEntries {
        instructions: InstructionStore;
    }
}
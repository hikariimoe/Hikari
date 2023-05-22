import { InstructionStore } from "../src/stores/InstructionStore";
import { SourceStore } from "../src/stores/SourceStore";

declare module "@sapphire/pieces" {
    interface StoreRegistryEntries {
        instructions: InstructionStore;
        sources: SourceStore;
    }
}
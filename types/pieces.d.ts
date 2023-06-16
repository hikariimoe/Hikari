import type { Ayame } from "../src/Ayame";
import type { SourceStore } from "../src/stores/SourceStore";
import type { ActionStore } from "../src/stores/ActionStore";

declare module "@sapphire/pieces" {
    interface Container {
        declare override client: Ayame;
    }

    interface StoreRegistryEntries {
        sources: SourceStore;
        actions: ActionStore;
    }
}
import { PluginStore } from "../src/stores/PluginStore";
import { ActionStore } from "../src/stores/ActionStore";
import { SourceStore } from "../src/stores/SourceStore";

declare module "@sapphire/pieces" {
    interface StoreRegistryEntries {
        plugins: PluginStore;
        actions: ActionStore;
        sources: SourceStore;
    }
}
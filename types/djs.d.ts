import { ContextManager } from "../src/managers/ContextManager";
import { Context } from "../src/structures/Context";

export interface Caches {
    ContextManager: [manager: typeof ContextManager, holds: typeof Context];
}
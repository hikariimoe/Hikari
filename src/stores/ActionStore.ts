import { Store } from "@sapphire/framework";
import { Action, ActionType } from "../structures/Action";

export class ActionStore extends Store<Action> {
    constructor() {
        super(Action, {
            name: "actions"
        })
    }

    public async loadAll(): Promise<void> {
        await super.loadAll();

        for (const action of this.values()) {
            if (action.type == ActionType.Unknown) {
                // get out.
                this.unload(action);
            }
        }
    }
}
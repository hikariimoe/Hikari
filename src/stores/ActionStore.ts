import { Action } from "../structures/Action";
import { Store } from "@sapphire/framework";

export class ActionStore extends Store<Action> {
    constructor() {
        super(Action, {
            name: "actions"
        });
    }
}
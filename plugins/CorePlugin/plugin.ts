import { Event, Plugin } from "../../src/api";

export class CorePlugin extends Plugin {
    constructor(context: Plugin.Context) {
        super(context);
    }

    @Event("load")
    loadEvent() {
        
    }
}
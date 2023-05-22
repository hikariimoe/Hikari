import { Store } from "@sapphire/framework";
import { Source } from "../structures/Source";

export class SourceStore extends Store<Source> {
    constructor() {
        super(Source, {
            name: "sources"
        });
    }
}
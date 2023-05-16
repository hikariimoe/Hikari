import { Store } from "@sapphire/framework";
import { Provider } from "../structures/Provider";

export class ProviderStore extends Store<Provider> {
    constructor() {
        super(Provider, { name: "providers" });
    }
}
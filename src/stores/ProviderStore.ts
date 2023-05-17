import { Provider } from "../structures/Provider";
import { Store } from "@sapphire/framework";

export class ProviderStore extends Store<Provider> {
    constructor() {
        super(Provider, {
            name: "providers"
        });
    }
}
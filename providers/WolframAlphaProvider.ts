import { PieceContext } from "@sapphire/framework";
import { Provider } from "../src/structures/Provider";

export class WolframAlphaProvider extends Provider {
    constructor(context: PieceContext) {
        super(context, {
            // TODO: figure out why "/api/v1/" doesn't work here
            url: "https://www.wolframalpha.com"
        });
    }

    async query(query: string): Promise<any> {

        return await this.request("/api/v1/llm-api", {
            query: {
                appid: this.container.client.configuration.bot.keys.wolfram_alpha,
                input: query
            }
        });
    }
}
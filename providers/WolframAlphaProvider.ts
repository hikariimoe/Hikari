import { PieceContext } from "@sapphire/framework";
import { Provider } from "../src/structures/Provider";

export class WolframAlphaProvider extends Provider {
    constructor(context: PieceContext) {
        super(context, {
            url: "https://www.wolframalpha.com/api/v1"
        })
    }

    async query(query: string): Promise<any> {
        return await this.request("/llm-api", {
            query: {
                appid: this.container.client.configuration.bot.keys.wolfram_alpha,
                input: encodeURIComponent(query)
            }
        });
    }
}
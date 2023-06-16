import { OpenAIApi, Configuration } from "openai";
import { load } from "cheerio";
import { AIConnector } from "../../structures/ai/AIConnector";
import { Ayame } from "../../Ayame";
import fetch from "node-fetch";

export enum ProxyType {
    Aicg
}

export class OpenAIConnector extends AIConnector<Configuration> {
    private _ai?: OpenAIApi;
    
    public get ai() {
        if (!this._ai) {
            this._ai = new OpenAIApi(this.config);
        }

        if (!this.connected) {
            throw new Error("The connector is not connected.");
        }

        return this._ai = new OpenAIApi(this.config);
    }
    
    constructor(client: Ayame) {
        super(client, "OpenAIConnector");
    }
    
    public override async connect() {
        if (!this.client.config.proxy.use_proxy) {
            this.logger.info("Proxy usage is disabled, so the connector will not attempt to use a proxy.");

            this.config = new Configuration({
                apiKey: this.client.config.bot.keys.openai,
            });

            this.connected = true;
            return;
        }

        this.logger.trace("Attempting to set a usable proxy from the list provided in the config.");
        await this.useProxy();
    }

    public override async disconnect() {
        this.connected = false;
        this.config = undefined;
        this._ai = undefined;
    }

    private async useProxy() {
        const proxies: Record<string, {
            time: number;
            type: ProxyType;
            data: any;
        }> = {};

        for (const proxy of this.client.config.proxy.preferred_proxies) {
            this.logger.trace(
                "checking",
                this.client.logger.color.hex("#a7e5fa")(proxy), // i think it'd be better to move this hex color thing to a separate constant
                "for viable use.."
            );

            let result = await this.testProxy(proxy);

            if (result) {
                proxies[proxy] = result;
            }
        }

        const proxyCount = Object.keys(proxies).length;
        this.logger.debug("Gathered a list of workable proxies.");
        this.logger.debug("Proxy list size", proxyCount);
        this.logger.trace("Determining which one works the best for our use case.");

        if (proxyCount === 0) {
            this.logger.fatal("No proxies were found to be usable. Please check your config and try again.");
            process.exit(1);
        }

        const proxy = Object.keys(proxies).reduce(
            (a, b) => proxies[a].time < proxies[b].time ? a : b
        );

        this.client.logger.info(
            this.client.logger.color.yellow(proxy),
            "was found to be the bext proxy available. Using it for all future requests."
        );

        this.config = new Configuration({
            basePath: proxies[proxy].data.endpoints.openai
        });
        this.connected = true;
    }

    private async testProxy(proxy: string): Promise<null | {
        time: number;
        type: ProxyType;
        data: any;
    }> {
        const start = Date.now();
        const homepage = await fetch(proxy);

        if (homepage.status !== 200) {
            this.client.logger.error(
                this.client.logger.color.hex("#a7e5fa")(proxy),
                "wasnt't found. It is likely that the proxy is invalid or down."
            );

            return null;
        }

        const $ = load(await homepage.text());
        const data = JSON.parse($("body > pre").text());

        if (data.config.promptLogging === "true") {
            this.client.logger.warn(
                this.client.logger.color.hex("#a7e5fa")(proxy),
                "is logging prompts. If this is fine with you, you can ignore this warning."
            );

            if (this.client.config.proxy.no_loggers) {
                this.client.logger.warn("Ignoring this proxy due to the no_loggers option being enabled.");
                return null;
            }
        }

        const ppx = await fetch(`${proxy}/api/v1`, {
            headers: {
                "Authorization": "Bearer " + this.client.config.proxy.keys[proxy],
            }
        });

        // Test the proxy for an OpenAI API call
        if (ppx.status === 401) {
            if (this.client.config.proxy.keys[proxy]) {
                this.client.logger.error(
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "has an invalid key. Please check your config and try again."
                )
            } else {
                this.client.logger.error(
                    this.client.logger.color.hex("#a7e5fa")(proxy),
                    "is missing an API key. Please check your config and try again."
                )
            }
        } else if (ppx.status !== 404) {
            this.client.logger.error(
                this.client.logger.color.hex("#a7e5fa")(proxy),
                "did not return a 404. This is an invalid proxy."
            )
        } else {
            this.client.logger.trace(
                this.client.logger.color.hex("#a7e5fa")(proxy),
                "is a valid proxy and will be considered for use."
            );

            return {
                time: Date.now() - start,
                type: ProxyType.Aicg, // TODO: Add proper proxy type detection
                data,
            };
        }
        
        return null;
    }
}
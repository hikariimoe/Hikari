import { container, Piece, PieceContext } from "@sapphire/framework";
import { ProviderError } from "../util/errors/ProviderError";
import { HikariContainer } from "./HikariContainer";
import { JSONUtil } from "../util/JSONUtil";
import { URL } from "url";

export interface ProviderRequestOptions extends RequestInit {
    query?: Record<string, string>;
}

export interface ProviderOptions extends Piece.Options {
    readonly url: string;
}

/**
 * A class that provides a means of interacting with an external API, or other external services.
 */
export class Provider<O extends ProviderOptions = ProviderOptions> extends Piece<O> {
    public url: string;

    // Why did the sapphire devs make this a fucking accessor (oh wait it's because container is a global singleton lmao)
    public get container(): HikariContainer {
        return container as HikariContainer;
    }

    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);
        
        this.url = options.url;
    }

    /**
     * Sends a request with the provided URL
     * @param {string} path The path to send the request to, this is appended after the URL given from creating this class.
     * @param {ProviderRequestOptions} options An optional options object to send additional data to the request.
     * @throws {ProviderError} Will throw an error if the response returned an error
     */
    public async request<T>(path: string, options: ProviderRequestOptions = {}): Promise<T | undefined> {       
        // if this works i don't like it
        const params = this.handleRequestUrl(options);
        const url = new URL(path, this.url);
        url.search = params.search;

        console.log(url.toString());

        const response = await fetch(url, options);
        const isJson = response.headers.get("content-type")?.includes("json");

        if (!response.ok) {
            const bodyBuffer = await response.arrayBuffer().then(Buffer.from);
            
            if (isJson) {
                const body = JSONUtil.tryParse(bodyBuffer.toString());

                if (body?.message !== undefined) {
                    throw new ProviderError(response, body.message);
                } else if (body?.error !== undefined && typeof body.error === "string") {
                    throw new ProviderError(response, body.error);
                }
            }
            
            throw new ProviderError(response, undefined);
        }

        return isJson
            ? await response.json()
            : await response.text() as T;
    }

    private handleRequestUrl(options: ProviderRequestOptions): URL {
        const url = new URL(this.url);

        if (options.query !== undefined) {
            for (const [key, value] of Object.entries(options.query)) {
                url.searchParams.append(key, value);
            }
        }

        return url;
    }
}
import { Piece, PieceContext } from "@sapphire/framework";
import { URL } from "url";
import { ProviderError } from "../util/errors/ProviderError";

export class Provider<O extends ProviderOptions = ProviderOptions> extends Piece<O> {
    public url?: string;

    constructor(context: PieceContext, options: O = {} as O) {
        super(context, options);

        this.url = options.url;
    }

    public async request<T>(path: string, options: ProviderRequestOptions = {}): Promise<T | undefined> {
        const response = await fetch(new URL(path, this.url), options);

        if (response.ok) {
            if (response.headers.get("content-type")?.includes("application/json")) {
                return await response.json();
            } else {
                // TODO: well
                return await response.text() as T;
            }
        } else {
            // Attempt to get an error message from the response
            let message: string | undefined;
            const bodyBuffer = await response.arrayBuffer().then(Buffer.from);

            try {
                if (response.headers.get("content-type")?.includes("json")) {
                    const body = JSON.parse(bodyBuffer.toString());

                    if (body.message !== undefined) {
                        message = body.message;
                    } else if (body.error !== undefined && typeof body.error === "string") {
                        message = body.error;
                    }
                }

                // TODO: find more means of getting error data
            } catch (error) {
                // ignore
            }

            throw new ProviderError(response, message);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProviderRequestOptions extends RequestInit {

}


export interface ProviderOptions extends Piece.Options {
    readonly url?: string;
}
export class ProviderError extends Error {
    public readonly code: number;
    public readonly response: Response;

    constructor(response: Response, message?: string) {
        super(message ?? response.statusText);

        this.code = response.status;
        this.response = response;
    }
}
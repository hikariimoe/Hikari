export enum SourceErrorType {
    Ratelimited,
    MalformedResponse,
    InternalError,
}

export interface SourceErrorData {
    message?: string;
    data?: any;
    until?: number;
}

export class SourceError extends Error {
    public readonly type: SourceErrorType;
    public readonly data: SourceErrorData;

    constructor(type: SourceErrorType, data: SourceErrorData = {}) {
        super(data.message);

        this.type = type;
        this.data = data;
    }
}
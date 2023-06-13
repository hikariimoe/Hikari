import { Plugin } from "../Plugin";


export interface EventMap {
    "load": [ ];
}

export type EventFunction = {
    (...args: any[]): void;

    event?: {
        name: keyof EventMap;
    }
}
export type AsyncEventFunction = {
    (...args: any[]): Promise<void>;

    event?: {
        name: keyof EventMap;
    }
}

export function Event(event: keyof EventMap) {
    return function (target: Plugin, key: string, descriptor: TypedPropertyDescriptor<EventFunction | AsyncEventFunction>) {
        descriptor.value!.event = {
            name: event
        }
    }
}
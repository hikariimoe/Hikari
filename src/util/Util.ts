import { deepClone } from "@sapphire/utilities";

export class Util {
    static omit<T, K extends keyof T>(obj: T | undefined, keys: K[]): Omit<T, K> {
        if (!obj) {
            return {} as Omit<T, K>;
        }

        const ret: Record<keyof T, any> | undefined = deepClone(obj);
        for (const key of Object.keys(obj)) {
            if (keys.includes(key as K)) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete ret[key as keyof T];
            }
        }

        return ret;
    }
}
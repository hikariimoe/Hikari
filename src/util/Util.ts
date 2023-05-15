import { deepClone } from "@sapphire/utilities";

export class Util {
    static omit<T, K extends keyof T>(obj: T | undefined, keys: K[]): Omit<T, K> {
        if (!obj) {
            return {} as Omit<T, K>;
        }

        const ret: Record<keyof T, any> | undefined = deepClone(obj);
        for (let key of Object.keys(obj)) {
            if (keys.includes(key as K)) {
                delete ret?.[key as keyof T];
            }
        }

        return ret;
    }
}
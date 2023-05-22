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

    static shrink<T extends object>(obj: T, destruct: boolean = true): T | null {
        const object = destruct ? Util.destructure(obj) : obj;
        
        if (Array.isArray(object)) {
            if (object.length == 0) {
                return null;
            }
            
            return object.filter(
                (x) => typeof x != "undefined" && x != null
            ).map((x) => typeof x == "object" ? this.shrink(x) : x) as T;
        } else {
            const clone = {} as Record<any, any>;
            for (const [key, value] of Object.entries(object)) {
                if (typeof value == "undefined" || value == null)
                    continue;
    
                clone[key] = typeof value == "object" ? this.shrink(value) : value;
            }
    
            return clone;
        }
    }

    static destructure(obj: object) {
        return JSON.parse(JSON.stringify(obj));
    }
}
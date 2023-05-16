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
        if (!obj) {
            return null;
        }

        // Certain objects can be very dense and wasteful of tokens, so this
        // function exists to deeply sanitize them and omit every possible
        // property that returns null, or is an empty object/array.
        
        if (destruct == true) {
            obj = Util.destructure(obj);
        }

        const ret: Record<keyof T, any> = deepClone(obj);

        for (const key of Object.keys(obj)) {
            let value = obj[key as keyof T] as unknown as any;

            // If the value is an object, recursively sanitize it.
            if (typeof value === "object") {
                value = this.shrink(value as object) as unknown as any;
            }

            // If the value is an array, recursively sanitize it.
            if (Array.isArray(value)) {
                let newArray: any[] = [];
                for (let v of value) {
                    if (v === null) {
                        continue;
                    }

                    if (typeof v === "object") {
                        v = this.shrink(v as object) as unknown as any;
                    }

                    newArray.push(v);
                }

                value = newArray;
            }

            // Then handle the value after.
            if (value === null) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete ret[key as keyof T];
            } else if (Array.isArray(value) && value.length === 0) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete ret[key as keyof T];
            } else if (typeof value === "object" && Object.keys(value).length === 0) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete ret[key as keyof T];
            }

        }
        
        return ret;
    }

    static destructure(obj: object) {
        return JSON.parse(JSON.stringify(obj));
    }
}
export class JSONUtil {
    async readjustJson() {
        throw new Error("Function unimplimented");
    }
    
    static tryParse(raw: string): any {
        try {
            return JSON.parse(raw);
        } catch (_) {
            return undefined;
        }
    }
}
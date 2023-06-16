export class OrderedSet<T> extends Set<T> {
    constructor(values?: readonly T[] | null) {
        super(values);
    }

    public get(index: number): T | undefined {
        return [...this.values()][index];
    }

    public last(): T | undefined {
        return this.get(this.size - 1);
    }

    public first(): T | undefined {
        return this.get(0);
    }
}
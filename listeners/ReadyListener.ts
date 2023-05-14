import { Listener } from "@sapphire/framework";
import { HikariListener } from "../src/structures/HikariListener";

export class ReadyListener extends HikariListener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: "ready"
        });
    }

    public run() {
        this.container.logger.info(`Logged in as ${this.container.client.user?.tag}`);
    }
}
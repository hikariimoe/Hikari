import { HikariContainer } from "./HikariContainer";
import { Listener } from "@sapphire/framework";
import { ClientEvents } from "discord.js";

export abstract class HikariListener< E extends keyof ClientEvents | symbol = ""> extends Listener<E> {
    get container(): HikariContainer {
        return super.container as HikariContainer;
    }
}
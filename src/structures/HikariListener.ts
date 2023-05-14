import { Listener } from "@sapphire/framework";
import { ClientEvents } from "discord.js";
import { HikariContainer } from "./HikariContainer";

export abstract class HikariListener< E extends keyof ClientEvents | symbol = ""> extends Listener<E> {
    get container(): HikariContainer {
        return super.container as HikariContainer;
    }
}
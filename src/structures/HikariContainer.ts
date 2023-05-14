import { Container } from "@sapphire/pieces";
import type { Hikari } from "../Hikari";

export interface HikariContainer extends Container {
    client: Hikari;
}
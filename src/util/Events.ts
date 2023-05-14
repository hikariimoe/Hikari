import { Events as SapphireEvents } from "@sapphire/framework";

export const Events = {
    // Add all of the default Sapphire events.
    ...SapphireEvents,

    // Command based events
    CommandRun: "commandRun",
};
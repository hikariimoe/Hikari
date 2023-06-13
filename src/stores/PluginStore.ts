import { Plugin } from "../structures/Plugin";
import { Store } from "@sapphire/framework";
import { basename, extname, join } from "path";
import toml from "toml";
import { readFile } from "fs/promises";
import { FilterResult, LoaderStrategy } from "@sapphire/pieces";

export class PluginLoaderStrategy extends LoaderStrategy<Plugin> {
    constructor() {
        super();
    }
    
    public filter(path: string): FilterResult {
		// Retrieve the file extension.
		const extension = extname(path);

		// Retrieve the name of the file, return null if empty.
		const name = basename(path, extension);
		if (name === '' || name !== "plugin") return null;

		// Return the name and extension.
		return { extension, path, name };
	}
}

export class PluginStore extends Store<Plugin> {
    public loaded: boolean = false;
    
    constructor() {
        super(Plugin, {
            name: "plugins",
            strategy: new PluginLoaderStrategy()
        });
    }

    // thievery
    public override async loadAll() {
        if (this.loaded) {
            return;
        }

        await super.loadAll();

        for (const plugin of this.values()) {
            plugin.loadEvents();
            
            // @ts-ignore
            plugin.constructor.container = {
                client: plugin.container.client,
                plugin
            }

            // get the manifest.toml from the plugin's directory
            const withoutFileRoot = plugin.location.full.replace(plugin.location.name, "");
            const file = join(withoutFileRoot, "/manifest.toml");

            // parse the manifest.toml
            try {
                const config = toml.parse(await readFile(file, "utf-8"));

                plugin.manifest = config as any;

                this.container.logger.debug(`Loaded manifest for plugin ${plugin.manifest.name}`);

                // load the plugin
                await plugin.load();
                plugin.emit("load");

                this.container.logger.debug(`Loaded plugin ${plugin.manifest.name}`);

            } catch (e) {
                this.container.logger.error(`Failed to find or parse manifest for plugin ${plugin.name}`);
                this.container.logger.error(e);

                // unload the plugin
                this.unload(plugin);
            }

        }

        this.loaded = true;
    }
}
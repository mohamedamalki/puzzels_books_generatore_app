import { DomainError } from "./errors";

export interface VersionedPlugin { readonly key: string; readonly version: string }

/** Allowlisted in-process implementations, never code loaded from database JSON. */
export class PluginRegistry<T extends VersionedPlugin> {
  private readonly plugins = new Map<string, T>();

  register(plugin: T): void {
    const id = this.id(plugin.key, plugin.version);
    if (this.plugins.has(id)) throw new DomainError("DUPLICATE_PLUGIN", `Plugin already registered: ${id}`);
    this.plugins.set(id, plugin);
  }

  get(key: string, version: string): T {
    const plugin = this.plugins.get(this.id(key, version));
    if (!plugin) throw new DomainError("PLUGIN_UNAVAILABLE", `Unsupported plugin: ${key}@${version}`);
    return plugin;
  }

  private id(key: string, version: string): string {
    if (!/^[a-z0-9-]+$/.test(key) || !/^\d+\.\d+\.\d+$/.test(version)) throw new DomainError("INVALID_PLUGIN_ID", "Use a slug and an exact semantic version");
    return `${key}@${version}`;
  }
}

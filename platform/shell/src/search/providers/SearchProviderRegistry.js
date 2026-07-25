/**
 * SearchProviderRegistry.js
 * ─────────────────────────
 * Central provider manager.
 *
 * A "provider" is a plain object with the shape:
 *   {
 *     id:       string,           — unique identifier
 *     type:     PROVIDER_TYPE.*,  — 'static' | 'dynamic' | 'ai'
 *     priority: number,           — merge order (lower = earlier); default 50
 *     getItems: () => Item[] | Promise<Item[]>
 *     cacheTtlMs?: number         — for dynamic providers; default 30_000
 *   }
 *
 * Usage:
 *   searchProviderRegistry.register(automationProvider);
 *   const items = await searchProviderRegistry.getAllItems();
 */

export class SearchProviderRegistry {
  #providers  = new Map();
  #dynCaches  = new Map(); // dynamic provider result caches

  /** Register a provider. Safe to call multiple times with the same id (replaces). */
  register(provider) {
    if (!provider?.id || typeof provider.getItems !== 'function') {
      console.warn('[SearchProviderRegistry] invalid provider — skipping:', provider);
      return;
    }
    this.#providers.set(provider.id, provider);
  }

  /** Unregister a provider by id. */
  unregister(id) {
    this.#providers.delete(id);
    this.#dynCaches.delete(id);
  }

  /**
   * Merge and return items from every registered provider.
   * Static providers are called synchronously.
   * Dynamic providers are called async with simple TTL caching.
   */
  async getAllItems() {
    const sorted = [...this.#providers.values()].sort(
      (a, b) => (a.priority ?? 50) - (b.priority ?? 50)
    );

    const results = await Promise.allSettled(
      sorted.map((p) => this.#getProviderItems(p))
    );

    const items = [];
    for (const r of results) {
      if (r.status === 'fulfilled') items.push(...(r.value || []));
    }
    return items;
  }

  /** Internal: resolves items for one provider, handles dynamic caching. */
  async #getProviderItems(provider) {
    if (provider.type === 'dynamic') {
      const cached = this.#dynCaches.get(provider.id);
      const ttl    = provider.cacheTtlMs ?? 30_000;
      if (cached && Date.now() - cached.ts < ttl) return cached.items;

      const items = await Promise.resolve(provider.getItems());
      this.#dynCaches.set(provider.id, { items, ts: Date.now() });
      return items;
    }

    // static / ai — call directly
    return Promise.resolve(provider.getItems());
  }

  /** How many providers are currently registered. */
  get size() { return this.#providers.size; }

  /** List all registered provider ids (for debugging). */
  list() { return [...this.#providers.keys()]; }
}

export const searchProviderRegistry = new SearchProviderRegistry();

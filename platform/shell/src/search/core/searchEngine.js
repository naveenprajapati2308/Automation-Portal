/**
 * searchEngine.js
 * ───────────────
 * Master orchestrator for the global search system.
 *
 * Responsibilities:
 *  - Owns the provider registry instance
 *  - Maintains an in-memory cache of all searchable items (TTL: 60s)
 *  - Delegates scoring to searchService
 *  - Injects entity-type constants into searchService (avoids circular deps)
 *  - Exposes a single async search() method consumed by the React hook
 */

import { rank, groupByCategory, groupByModule, _entityHelpers } from './searchService.js';
import { ENTITY_LABEL, ENTITY_ORDER } from './searchTypes.js';

// Inject entity helpers into the service (avoids circular import)
_entityHelpers.ENTITY_LABEL = ENTITY_LABEL;
_entityHelpers.ENTITY_ORDER = ENTITY_ORDER;

const CACHE_TTL_MS = 60_000; // re-build index every 60 seconds

class SearchEngine {
  #registry = null;
  #cache    = null;
  #cacheTs  = 0;

  /**
   * Attach the provider registry. Called once at app bootstrap.
   * @param {import('../providers/SearchProviderRegistry.js').SearchProviderRegistry} registry
   */
  setRegistry(registry) {
    this.#registry = registry;
  }

  /** Pre-load all provider items into the cache. */
  async warmup() {
    if (!this.#registry) return;
    try {
      this.#cache  = await this.#registry.getAllItems();
      this.#cacheTs = Date.now();
    } catch (err) {
      console.warn('[SearchEngine] warmup failed:', err);
      this.#cache = [];
    }
  }

  /** Force the cache to expire on next search() call. */
  invalidateCache() {
    this.#cache = null;
    this.#cacheTs = 0;
  }

  /**
   * Search across all registered providers.
   *
   * @param {string} query
   * @returns {Promise<{
   *   flat:       object[],
   *   byCategory: { category: string, label: string, items: object[] }[],
   *   byModule:   { module: string, items: object[] }[]
   * }>}
   */
  async search(query) {
    // Refresh cache if stale or missing
    if (!this.#cache || Date.now() - this.#cacheTs > CACHE_TTL_MS) {
      await this.warmup();
    }

    const flat = rank(query, this.#cache || []);

    return {
      flat,
      byCategory: groupByCategory(flat),
      byModule:   groupByModule(flat),
    };
  }

  /**
   * Returns all items (unfiltered) — used to build suggestion chips.
   */
  async getAllItems() {
    if (!this.#cache || Date.now() - this.#cacheTs > CACHE_TTL_MS) {
      await this.warmup();
    }
    return this.#cache || [];
  }
}

// Singleton — imported everywhere that needs search
export const searchEngine = new SearchEngine();

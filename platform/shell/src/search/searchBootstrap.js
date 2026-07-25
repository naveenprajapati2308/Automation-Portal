/**
 * searchBootstrap.js
 * ──────────────────
 * Called once at app startup (in main.jsx) before the React tree renders.
 *
 * Responsibilities:
 *  1. Register all module providers with the provider registry
 *  2. Attach the registry to the search engine singleton
 *  3. Kick off the initial cache warm-up (async, non-blocking)
 *
 * To add a new module to search:
 *   1. Create a new *Provider.js file in /providers/
 *   2. Import it here and call searchProviderRegistry.register(newProvider)
 *   That's it — no other files need changing.
 */
import { searchEngine }            from './core/searchEngine.js';
import { searchProviderRegistry }  from './providers/SearchProviderRegistry.js';
import { dashboardProvider }       from './providers/dashboardProvider.js';
import { automationProvider }      from './providers/automationProvider.js';
import { apiTestingProvider }      from './providers/apiTestingProvider.js';
import { adminProvider }           from './providers/adminProvider.js';
import { performanceProvider }     from './providers/performanceProvider.js';

export function bootstrapSearch() {
  // Register all providers
  searchProviderRegistry.register(dashboardProvider);
  searchProviderRegistry.register(automationProvider);
  searchProviderRegistry.register(apiTestingProvider);
  searchProviderRegistry.register(adminProvider);
  searchProviderRegistry.register(performanceProvider);

  // Attach registry to the engine singleton
  searchEngine.setRegistry(searchProviderRegistry);

  // Warm up cache in background — doesn't block app startup
  searchEngine.warmup().catch(() => {
    // Warmup failure is safe — search() will retry on first keystroke
  });
}

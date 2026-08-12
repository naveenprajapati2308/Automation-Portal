
import { searchEngine } from './core/searchEngine.js';
import { searchProviderRegistry } from './providers/SearchProviderRegistry.js';
import { dashboardProvider } from './providers/dashboardProvider.js';
import { automationProvider } from './providers/automationProvider.js';
import { apiTestingProvider } from './providers/apiTestingProvider.js';
import { adminProvider } from './providers/adminProvider.js';
import { performanceProvider } from './providers/performanceProvider.js';

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
    
  });
}

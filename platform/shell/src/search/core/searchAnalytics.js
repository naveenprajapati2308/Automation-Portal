/**
 * searchAnalytics.js
 * ──────────────────
 * Local search analytics tracker.
 * All data persisted to localStorage under 'testrix:searchAnalytics'.
 * Ready for future backend sync via analytics.export().
 */

const STORAGE_KEY = 'testrix:searchAnalytics';
const MAX_NAV_LOG = 100;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — silently skip
  }
}

function getStore() {
  const d = load();
  return {
    mostSearched:  d.mostSearched  || {},   // { query → count }
    zeroResults:   d.zeroResults   || {},   // { query → count }
    navigationLog: d.navigationLog || [],   // [{ itemId, page, timestamp }]
    frequentPages: d.frequentPages || {},   // { itemId → count }
  };
}

export const searchAnalytics = {
  /**
   * Called whenever a search query is executed.
   * @param {string} query
   * @param {number} resultCount
   */
  recordQuery(query, resultCount) {
    if (!query || !query.trim()) return;
    const q = query.trim().toLowerCase();
    const store = getStore();

    store.mostSearched[q] = (store.mostSearched[q] || 0) + 1;
    if (resultCount === 0) {
      store.zeroResults[q] = (store.zeroResults[q] || 0) + 1;
    }

    save(store);
  },

  /**
   * Called when a user navigates to a search result.
   * @param {{ id: string, page: string, module: string }} item
   */
  recordNavigation(item) {
    const store = getStore();

    // Frequency map
    store.frequentPages[item.id] = (store.frequentPages[item.id] || 0) + 1;

    // Navigation log (capped at MAX_NAV_LOG)
    store.navigationLog.unshift({
      itemId:    item.id,
      page:      item.page,
      module:    item.module,
      timestamp: Date.now(),
    });
    if (store.navigationLog.length > MAX_NAV_LOG) {
      store.navigationLog = store.navigationLog.slice(0, MAX_NAV_LOG);
    }

    save(store);
  },

  /**
   * Returns current analytics stats snapshot.
   */
  getStats() {
    const store = getStore();

    const topSearched = Object.entries(store.mostSearched)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const topZeroResults = Object.entries(store.zeroResults)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const topPages = Object.entries(store.frequentPages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([itemId, count]) => ({ itemId, count }));

    return { topSearched, topZeroResults, topPages };
  },

  /**
   * Exports full analytics payload as JSON string — ready for backend POST.
   */
  export() {
    return JSON.stringify(getStore(), null, 2);
  },

  /**
   * Clears all analytics data.
   */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

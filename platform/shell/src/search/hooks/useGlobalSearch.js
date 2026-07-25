/**
 * useGlobalSearch.js
 * ──────────────────
 * React hook — the single entry point for all search state.
 *
 * Returns everything the GlobalSearchDropdown needs:
 *   query, setQuery, results (flat / byCategory / byModule),
 *   recentSearches, suggestions, selectedIndex, handleKeyDown,
 *   clearRecent, removeRecent, addToRecent, isOpen, setIsOpen, isLoading
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchEngine }    from '../core/searchEngine.js';
import { searchAnalytics } from '../core/searchAnalytics.js';
import { SUGGESTED_QUERIES } from '../core/searchTypes.js';

const RECENT_KEY   = 'testrix:recentSearches';
const MAX_RECENT   = 10;
const DEBOUNCE_MS  = 150;

// ── localStorage helpers ────────────────────────────────────────────────────
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }
  catch { /* quota exceeded — silent */ }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * @param {{ onNavigate: (item: object) => void }} options
 */
export function useGlobalSearch({ onNavigate }) {
  const [query,          setQuery]          = useState('');
  const [isOpen,         setIsOpen]         = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [rawResults,     setRawResults]     = useState({ flat: [], byCategory: [], byModule: [] });
  const [recentSearches, setRecentSearches] = useState(() => loadRecent());
  const [selectedIndex,  setSelectedIndex]  = useState(-1);

  const debounceRef = useRef(null);

  // ── Warm up the engine on first open ──────────────────────────────────────
  useEffect(() => {
    searchEngine.warmup();
  }, []);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setRawResults({ flat: [], byCategory: [], byModule: [] });
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchEngine.search(query);
        setRawResults(res);
        searchAnalytics.recordQuery(query, res.flat.length);
      } catch {
        setRawResults({ flat: [], byCategory: [], byModule: [] });
      } finally {
        setIsLoading(false);
        setSelectedIndex(-1);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Memoised results ───────────────────────────────────────────────────────
  const results = useMemo(() => rawResults, [rawResults]);

  // ── Flat list for keyboard navigation ─────────────────────────────────────
  // Includes disabled items so they can be skipped with arrow keys gracefully
  const flatList = useMemo(() => results.flat, [results]);

  // ── Recent searches helpers ────────────────────────────────────────────────
  const addToRecent = useCallback((label) => {
    if (!label || !label.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r !== label);
      const next = [label, ...filtered].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((label) => {
    setRecentSearches((prev) => {
      const next = prev.filter((r) => r !== label);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    saveRecent([]);
  }, []);

  // ── Navigate to a result ───────────────────────────────────────────────────
  const navigateTo = useCallback((item) => {
    if (!item || item.disabled) return;
    addToRecent(item.page);
    searchAnalytics.recordNavigation(item);
    setIsOpen(false);
    setQuery('');
    onNavigate(item);
  }, [addToRecent, onNavigate]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
        break;

      case 'Enter': {
        e.preventDefault();
        if (selectedIndex >= 0 && flatList[selectedIndex]) {
          navigateTo(flatList[selectedIndex]);
        }
        break;
      }

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        break;
    }
  }, [isOpen, flatList, selectedIndex, navigateTo]);

  return {
    query,
    setQuery,
    results,
    recentSearches,
    suggestions: SUGGESTED_QUERIES,
    selectedIndex,
    handleKeyDown,
    navigateTo,
    addToRecent,
    removeRecent,
    clearRecent,
    isOpen,
    setIsOpen,
    isLoading,
  };
}

/**
 * GlobalSearchDropdown.jsx
 * ────────────────────────
 * The main search UI — a Docker Desktop-style command palette dropdown.
 *
 * Features:
 *  - Ctrl+K global focus shortcut
 *  - Real-time search with 150ms debounce
 *  - Recent searches (persisted to localStorage)
 *  - Suggested search chips
 *  - Live results grouped by entity category
 *  - Text highlighting on matched query
 *  - Keyboard navigation (↑↓ Enter Escape)
 *  - Permission-filtered items (SUPER_ADMIN items only shown to admins)
 *  - Disabled items shown with SOON badge but not clickable
 *  - Loading indicator while async providers resolve
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  Clock, Loader2, Search, Sparkles, X
} from 'lucide-react';
import '../searchStyles.css';
import { useGlobalSearch } from '../hooks/useGlobalSearch.js';
import { SearchResultItem } from './SearchResultItem.jsx';

/**
 * @param {{
 *   onNavigate:  (item: object) => void,
 *   superAdmin?: boolean,
 * }} props
 */
export function GlobalSearchDropdown({ onNavigate, superAdmin = false }) {
  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  // Filter wrapper — respect permission field
  const handleNavigate = useCallback((item) => {
    if (item.permission === 'SUPER_ADMIN' && !superAdmin) return;
    onNavigate(item);
  }, [onNavigate, superAdmin]);

  const {
    query, setQuery,
    results,
    recentSearches,
    suggestions,
    selectedIndex,
    handleKeyDown,
    navigateTo,
    removeRecent,
    clearRecent,
    isOpen, setIsOpen,
    isLoading,
  } = useGlobalSearch({ onNavigate: handleNavigate });

  // ── Ctrl+K global shortcut ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setIsOpen]);

  // ── Click-outside to close ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setIsOpen]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasQuery    = query.trim().length > 0;
  const hasResults  = results.flat.length > 0;
  const showDropdown = isOpen;

  // Filter results by permission
  const filteredByCategory = results.byCategory.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !(item.permission === 'SUPER_ADMIN' && !superAdmin)
    ),
  })).filter((g) => g.items.length > 0);

  // Build flat list in category order for selectedIndex mapping
  const flatFiltered = filteredByCategory.flatMap((g) => g.items);

  // Global flat index for the item: used to check if item is "selected"
  const flatIndexMap = new Map(flatFiltered.map((item, i) => [item.id, i]));

  return (
    <div className="gs-wrapper" ref={dropdownRef}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className={`gs-input-row ${isOpen ? 'open' : ''}`}>
        <span className="gs-icon">
          {isLoading
            ? <Loader2 size={15} className="gs-spinner" />
            : <Search size={15} />
          }
        </span>
        <input
          ref={inputRef}
          id="global-search-input"
          type="text"
          className="gs-input"
          placeholder="Search anything..."
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
        />
        {query
          ? (
            <button
              type="button"
              className="gs-clear-btn"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )
          : <span className="tb-kbd gs-kbd">Ctrl+K</span>
        }
      </div>

      {/* ── Dropdown panel ────────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="gs-dropdown" role="listbox" aria-label="Search results">

          {/* ── Empty state: show recent + suggestions ─────────────────── */}
          {!hasQuery && (
            <>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="gs-section">
                  <div className="gs-section-header">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      className="gs-clear-all"
                      onClick={clearRecent}
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="gs-recent-item"
                      onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                    >
                      <Clock size={13} className="gs-recent-icon" />
                      <span className="gs-recent-label">{r}</span>
                      <button
                        type="button"
                        className="gs-recent-remove"
                        onClick={(e) => { e.stopPropagation(); removeRecent(r); }}
                        title="Remove"
                      >
                        <X size={11} />
                      </button>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              <div className="gs-section">
                <div className="gs-section-header">
                  <Sparkles size={12} style={{ marginRight: 4 }} />
                  <span>Suggested</span>
                </div>
                <div className="gs-suggestions-grid">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="gs-suggestion-chip"
                      onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Active search: grouped results ─────────────────────────── */}
          {hasQuery && (
            <>
              {isLoading && !hasResults && (
                <div className="gs-empty">
                  <Loader2 size={18} className="gs-spinner" />
                  <span>Searching…</span>
                </div>
              )}

              {!isLoading && !hasResults && (
                <div className="gs-empty">
                  <Search size={18} style={{ opacity: 0.3 }} />
                  <span>No results for <strong>"{query}"</strong></span>
                  <span className="gs-empty-hint">Try a different keyword or module name</span>
                </div>
              )}

              {filteredByCategory.map((group) => (
                <div key={group.category} className="gs-section">
                  <div className="gs-section-header">
                    <span>{group.label}</span>
                    <span className="gs-section-count">{group.items.length}</span>
                  </div>
                  {group.items.map((item) => {
                    const flatIdx = flatIndexMap.get(item.id) ?? -1;
                    return (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        query={query}
                        isSelected={selectedIndex === flatIdx}
                        onSelect={navigateTo}
                      />
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* ── Footer keyboard hints ──────────────────────────────────── */}
          <div className="gs-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}

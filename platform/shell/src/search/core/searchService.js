/**
 * searchService.js
 * ────────────────
 * Pure scoring and ranking engine.
 * No React, no side effects, no imports from outside this file.
 * Takes a query string + array of search items → returns ranked results.
 *
 * Scoring tiers (can stack):
 *   100 — Exact page/title match
 *    80 — Title starts with query
 *    75 — Acronym match
 *    65 — Abbreviation prefix match
 *    60 — Title contains query
 *    50 — Keyword exact match
 *    40 — Keyword starts-with
 *    30 — Keyword contains
 *    25 — Synonym match
 *    10 — Description contains
 *   5-15 — Fuzzy match (Levenshtein ≤ 2, only for query.length >= 3)
 */

const MAX_RESULTS = 20;

// ── Levenshtein Distance (pure JS, no deps) ───────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows to save memory
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// ── Acronym check: does `query` match the initials of `text`? ─────────────────
// e.g. 'ec' matches 'Execution Center', 'at' matches 'API Testing'
function matchesAcronym(query, text) {
  const words = text.toLowerCase().split(/\s+/);
  const initials = words.map((w) => w[0]).join('');
  return initials.startsWith(query.toLowerCase());
}

// ── Score a single item against a query ───────────────────────────────────────
function scoreItem(item, query) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const title = (item.page || '').toLowerCase();
  const desc  = (item.description || '').toLowerCase();
  const keys  = (item.keywords  || []).map((k) => k.toLowerCase());
  const syns  = (item.synonyms  || []).map((s) => s.toLowerCase());
  const acros = (item.acronyms  || []).map((a) => a.toLowerCase());

  let score = 0;

  // ── Exact title
  if (title === q) { score += 100; }
  // ── Starts with
  else if (title.startsWith(q)) { score += 80; }
  // ── Title contains
  else if (title.includes(q)) { score += 60; }

  // ── Explicit acronym field
  if (acros.includes(q)) { score += 75; }

  // ── Dynamic acronym (computed from title words)
  if (matchesAcronym(q, item.page || '')) { score += 70; }

  // ── Abbreviation prefix: query is a prefix of a word in the title
  const titleWords = title.split(/\s+/);
  if (titleWords.some((w) => w.startsWith(q) && w !== q)) { score += 65; }

  // ── Keywords
  for (const k of keys) {
    if (k === q)            { score += 50; break; }
    if (k.startsWith(q))   { score += 40; break; }
    if (k.includes(q))     { score += 30; break; }
  }

  // ── Synonyms
  if (syns.some((s) => s.includes(q))) { score += 25; }

  // ── Description
  if (desc.includes(q)) { score += 10; }

  // ── Fuzzy (only when no strong match found yet, and query >= 3 chars)
  if (score === 0 && q.length >= 3) {
    const titleDist = levenshtein(q, title.slice(0, q.length + 2));
    if (titleDist <= 1) { score += 15; }
    else if (titleDist <= 2) { score += 5; }

    // Also try each word in the title
    if (score === 0) {
      for (const w of titleWords) {
        const dist = levenshtein(q, w);
        if (dist <= 1 && w.length >= 3) { score += 12; break; }
        if (dist <= 2 && w.length >= 4) { score += 4; break; }
      }
    }

    // Try keywords with fuzzy
    if (score === 0) {
      for (const k of keys) {
        const dist = levenshtein(q, k);
        if (dist <= 1 && k.length >= 3) { score += 8; break; }
      }
    }
  }

  return score;
}

// ── Group results by a key fn, preserving per-group order ────────────────────
function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * rank(query, items)
 * Returns up to MAX_RESULTS items sorted by score (descending).
 * Each returned item has an extra `_score` field for debugging.
 *
 * @param {string} query
 * @param {object[]} items  — full provider item array
 * @returns {object[]}      — scored + sorted results
 */
export function rank(query, items) {
  if (!query || !query.trim()) return [];

  const scored = [];
  for (const item of items) {
    if (item.disabled) continue;  // never surface disabled items in live results
    const s = scoreItem(item, query);
    if (s > 0) scored.push({ ...item, _score: s });
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, MAX_RESULTS);
}

/**
 * groupByCategory(results)
 * Groups results by entityType label, sorted by ENTITY_ORDER.
 * Returns an array of { category, label, items[] }.
 *
 * @param {object[]} results  — output of rank()
 * @returns {{ category: string, label: string, items: object[] }[]}
 */
export function groupByCategory(results) {
  // Import inline to avoid circular deps — entityType constants are plain strings
  const { ENTITY_LABEL, ENTITY_ORDER } = _entityHelpers;

  const map = groupBy(results, (item) => item.entityType || 'page');
  const groups = [];
  for (const [cat, items] of map.entries()) {
    groups.push({
      category: cat,
      label: ENTITY_LABEL[cat] || cat,
      order: ENTITY_ORDER[cat] ?? 99,
      items,
    });
  }
  return groups.sort((a, b) => a.order - b.order);
}

/**
 * groupByModule(results)
 * Groups results by module name.
 * Returns an array of { module, items[] }.
 */
export function groupByModule(results) {
  const map = groupBy(results, (item) => item.module || 'Other');
  return [...map.entries()].map(([mod, items]) => ({ module: mod, items }));
}

// ── Internal helpers injected after import to avoid circular deps ─────────────
// (populated by searchEngine.js on startup)
export const _entityHelpers = {
  ENTITY_LABEL: {},
  ENTITY_ORDER: {},
};

/**
 * SearchHighlight.jsx
 * ───────────────────
 * Renders text with matched query characters highlighted via <mark>.
 * Handles case-insensitive, multi-word queries.
 *
 * Example: text="Execution Center", query="exec"
 * Output:  <><mark>Exec</mark>ution Center</>
 */

/**
 * @param {{ text: string, query: string }} props
 */
export function SearchHighlight({ text, query }) {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>;
  }

  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex chars
  const regex = new RegExp(`(${q})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="search-highlight">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

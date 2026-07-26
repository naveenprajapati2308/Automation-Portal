import { Loader } from '../Loader.jsx';

// Recipe: per-widget "still loading" placeholder — use inside a chart/table card
// on first mount (before any data has arrived), sized to roughly match the
// content it will be replaced by so nothing jumps around once data lands.
export function LoadingBlock({ label = 'Loading…', minHeight = 200, size = 28 }) {
  return (
    <div style={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader size={size} label={label} />
    </div>
  );
}

import { Bar } from 'react-chartjs-2';
import './chartSetup.js';
import './tokens.css';
import { Card } from './Card.jsx';
import { LoadingBlock } from './LoadingBlock.jsx';
import { EmptyState } from './EmptyState.jsx';
import { resolveThemeColors } from './resolveThemeColors.js';
import { useThemeVersion } from './useThemeVersion.js';

// Recipe: the ONE Execution Trend chart every dashboard uses. `series` lets each
// module chart its own metrics through the same visual language — API Testing/
// Performance pass 2 series (passed/failed), Automation passes a 3rd (skipped);
// nothing else about the component changes. Each point in `data` just needs a
// `date` (yyyy-MM-dd) and/or a pre-formatted `label`, plus one number per series key.
export function ExecutionTrendChart({
  title,
  data = [],
  series,
  loading = false,
  emptyMessage = 'No trend data available for this range.',
  className = '',
}) {
  useThemeVersion(); // re-render (and thus re-resolve colors below) on theme toggle
  const tokens = resolveThemeColors(['--text-muted', '--border-soft', ...series.map((s) => s.color).filter((c) => c.startsWith('--'))]);
  const colorOf = (c) => (c.startsWith('--') ? tokens[c] || c : c);

  const labels = data.map((d) => d.label ?? (d.date ? String(d.date).slice(5) : ''));
  const chartData = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: data.map((d) => d[s.key] ?? 0),
      backgroundColor: colorOf(s.color),
      borderRadius: 4,
      maxBarThickness: 22,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: tokens['--text-muted'], boxWidth: 10, boxHeight: 10, usePointStyle: true },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tokens['--text-muted'], font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: tokens['--border-soft'] }, ticks: { color: tokens['--text-muted'], precision: 0, font: { size: 11 } } },
    },
  };

  return (
    <Card className={className}>
      {title && <h3 className="tx-card-title">{title}</h3>}
      <div style={{ height: 208 }}>
        {loading ? (
          <LoadingBlock label="Loading trend analytics..." minHeight={208} />
        ) : data.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </Card>
  );
}

import { ArrowUpRight } from 'lucide-react';

// Shared by the shell's Global Dashboard and the Admin Dashboard — the compact
// top-row summary card: icon badge + title + optional health/soon indicator +
// one big KPI + one-line summary + optional "See More" link.
export function HealthDot({ state }) {
  const cls = state === 'up' ? 'card-dot up' : state === 'down' ? 'card-dot down' : 'card-dot';
  const label = state === 'up' ? 'Online' : state === 'down' ? 'Offline' : 'Checking…';
  return <span className="card-health"><span className={cls} />{label}</span>;
}

export function OverviewCard({ icon: Icon, tone, label, health: healthState, kpiValue, kpiLabel, summary, soon, onSeeMore }) {
  return (
    <div className={`card ${soon ? 'card-soon' : ''}`}>
      <div className="card-head">
        <div className="card-head-left">
          <div className={`card-icon card-icon-${tone}`}><Icon size={18} /></div>
          <h2>{label}</h2>
        </div>
        {soon ? <span className="soon">Soon</span> : healthState && <HealthDot state={healthState} />}
      </div>
      {kpiValue !== undefined && (
        <div className="card-kpi">
          <span className="card-kpi-value">{kpiValue}</span>
          {kpiLabel && <span className="card-kpi-label">{kpiLabel}</span>}
        </div>
      )}
      <p>{summary}</p>
      {onSeeMore && (
        <button type="button" className="open-btn" onClick={onSeeMore}>
          See More <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

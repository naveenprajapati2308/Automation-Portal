import { Metric } from '../shared/index.jsx';

// ── Environment View Page ─────────────────────────────────────────────────────
export function EnvironmentView({ environments }) {
  return (
    <section className="page-grid">
      {environments.map((env) => (
        <Metric key={env.id} label={env.code} value={env.active ? 'Active' : 'Disabled'} />
      ))}

    </section>



  );
}

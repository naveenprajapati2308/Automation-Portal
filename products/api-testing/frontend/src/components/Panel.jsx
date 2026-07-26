import { Card } from '../../../../../shared/ui/dashboard/Card.jsx';

// Thin re-export so every other page importing Panel (Scheduler, GroupsPanel,
// RequestWorkspace, etc.) keeps working unchanged while picking up the shared
// card treatment (shadow/hover) — see shared/ui/dashboard/Card.jsx.
export function Panel({ children, className = '', padded = true }) {
  return <Card className={className} padded={padded}>{children}</Card>;
}

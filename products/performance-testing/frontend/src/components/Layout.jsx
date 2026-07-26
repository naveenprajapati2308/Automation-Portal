import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Gauge, TrendingUp, Layers, CalendarClock, History } from 'lucide-react';
import testrixLogo from '../assets/testrix_logo.png';
import { reportHeightToParent } from '../../../../../shared/ui/iframe-resize.js';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/virtual-users', label: 'Virtual Users', icon: Users },
  { to: '/performance-tests', label: 'Performance Tests', icon: Gauge },
  { to: '/load-tests', label: 'Load Tests', icon: TrendingUp },
  { to: '/groups', label: 'Test Groups', icon: Layers },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarClock },
  { to: '/runs', label: 'Run History', icon: History },
];

function useEmbeddedNavigation(isEmbedded) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isEmbedded) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'testrix:navigate' && typeof event.data.path === 'string') {
        navigate(event.data.path);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isEmbedded, navigate]);
}

export default function Layout() {
  const isEmbedded = window.self !== window.top;
  useEmbeddedNavigation(isEmbedded);

  useEffect(() => {
    if (!isEmbedded) return;
    return reportHeightToParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isEmbedded) {
    return (
      <div className="h-full w-full overflow-auto bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[var(--bg-page)] text-[var(--text-primary)]">
      <aside className="w-52 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[var(--border)]">
          <img src={testrixLogo} alt="TESTRIX" className="w-[18px] h-[18px] object-contain rounded" />
          <span className="font-semibold tracking-tight text-sm">Performance</span>
        </div>
        <nav className="flex-1 py-3 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                  ? 'bg-[var(--accent-bg-soft)] text-[var(--accent-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] leading-relaxed">
          k6 runs server-side — no browser CORS limits.
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

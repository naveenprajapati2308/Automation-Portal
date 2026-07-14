import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Send, CalendarClock, History, Zap, Database, Workflow, FolderTree } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tester', label: 'API Tester', icon: Send },
  { to: '/base-apis', label: 'Base APIs', icon: Database },
  { to: '/regular-apis', label: 'Regular APIs', icon: Workflow },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarClock },
  { to: '/history', label: 'History', icon: History },
  { to: '/modules', label: 'Modules', icon: FolderTree },
];

export default function Layout() {
  return (
    <div className="h-screen flex bg-[#181818] text-zinc-200">
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 bg-[#1c1c1e]">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-800">
          <Zap size={18} className="text-emerald-400" />
          <span className="font-semibold tracking-tight text-sm">API Platform</span>
        </div>
        <nav className="flex-1 py-3 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-300'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed">
          Execution runs server-side — no browser CORS limits.
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

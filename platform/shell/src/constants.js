// Sub-menu shown when "Automation" is expanded in the main sidebar — mirrors
// automation-portal's own USER_NAV, one page per key.
export const AUTOMATION_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Gauge' },
  { key: 'execution', label: 'Execution Center', icon: 'Play' },
  { key: 'reports', label: 'Reports Center', icon: 'FileText' },
  { key: 'logs', label: 'Test Logs', icon: 'TerminalSquare' },
  { key: 'screenshots', label: 'Screenshots', icon: 'Camera' },
  { key: 'compare', label: 'Historical Compare', icon: 'GitCompare' },
  { key: 'environments', label: 'Environments', icon: 'Globe2' }
];

export const API_TESTING_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { key: 'tester', label: 'API Tester', icon: 'Send', path: '/tester' },
  { key: 'base-apis', label: 'Base APIs', icon: 'Database', path: '/base-apis' },
  { key: 'regular-apis', label: 'Regular APIs', icon: 'Workflow', path: '/regular-apis' },
  { key: 'scheduler', label: 'Scheduler', icon: 'CalendarClock', path: '/scheduler' },
  { key: 'history', label: 'History', icon: 'History', path: '/history' },
  { key: 'modules', label: 'Modules', icon: 'FolderTree', path: '/modules' }
];

export const SIDEBAR_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'automation', label: 'Automation', icon: 'Play', children: AUTOMATION_NAV },
  { key: 'apitest', label: 'API Testing', icon: 'Globe2', children: API_TESTING_NAV },
  { key: 'perf', label: 'Performance', icon: 'Gauge', disabled: true },
  { key: 'profile', label: 'Profile', icon: 'UserCircle' }
];

export const ADMIN_NAV = [
  { key: 'admin', label: 'Administration', icon: 'LayoutDashboard' }
];


export const ADMIN_WORKSPACE_NAV = [
  { key: 'admin-dashboard', label: 'Admin Dashboard', icon: 'Shield' },
  {
    key: 'automation-admin',
    label: 'Automation',
    icon: 'Play',
    children: [
      { key: 'environments-config', label: 'Environments', icon: 'Globe2' },
      { key: 'module-management', label: 'Module Management', icon: 'Package' },
      { key: 'portal-config', label: 'System Config', icon: 'Sliders' }
    ]
  },
  {
    key: 'apitest-admin',
    label: 'API Testing',
    icon: 'Zap',
    children: [
      { key: 'apitest-admin-soon', label: 'Coming Soon', icon: 'Clock' }
    ]
  },
  {
    key: 'user-management-admin',
    label: 'User Management',
    icon: 'Users',
    children: [
      { key: 'user-management', label: 'Manage Users', icon: 'Users' },
      { key: 'role-management', label: 'Role Management', icon: 'UserCog' },
      { key: 'access-management', label: 'Access Management', icon: 'KeyRound' }
    ]
  },
  {
    key: 'docs-admin',
    label: 'Documentation',
    icon: 'BookOpen',
    children: [
      { key: 'documentation', label: 'Documentation', icon: 'BookOpen' },
      { key: 'api-collection', label: 'API Reference', icon: 'TerminalSquare' }
    ]
  }
];


export const ADMIN_WORKSPACE_NAV_FLAT = ADMIN_WORKSPACE_NAV.flatMap((item) => item.children ?? [item]);

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'Tech lead ', 'QA_LEAD', 'AUTOMATION_ENGINEER', 'VIEWER'];

export const isSuperAdmin = (session) => session?.user?.role === 'SUPER_ADMIN';

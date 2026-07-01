export const USER_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Gauge' },
  { key: 'execution', label: 'Execution Center', icon: 'Play' },
  { key: 'reports', label: 'Reports Center', icon: 'FileText' },
  { key: 'logs', label: 'Test Logs', icon: 'TerminalSquare' },
  { key: 'screenshots', label: 'Screenshots', icon: 'Camera' },
  { key: 'compare', label: 'Historical Compare', icon: 'GitCompare' },
  { key: 'environments', label: 'Environments', icon: 'Globe2' },
  { key: 'profile', label: 'Profile', icon: 'UserCircle' }
];

export const ADMIN_NAV = [
  { key: 'admin', label: 'Administration', icon: 'LayoutDashboard' }
];

// Nav items shown inside the dedicated Admin Workspace sidebar
export const ADMIN_WORKSPACE_NAV = [
  { key: 'admin-dashboard',      label: 'Admin Dashboard',      icon: 'Shield' },
  { key: 'user-management',      label: 'User Management',      icon: 'Users' },
  { key: 'environments-config',  label: 'Environments',         icon: 'Globe2' },
  { key: 'portal-config',        label: 'System Config',        icon: 'Sliders' },
  { key: 'module-management',     label: 'Module Management',    icon: 'Package' },
  { key: 'role-management',      label: 'Role Management',      icon: 'UserCog' },
  { key: 'access-management',    label: 'Access Management',    icon: 'KeyRound' },
  { key: 'documentation',        label: 'Documentation',        icon: 'BookOpen' },
  { key: 'api-collection',       label: 'API Collection',       icon: 'TerminalSquare' }
];

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'QA_LEAD', 'AUTOMATION_ENGINEER', 'VIEWER'];

export const isSuperAdmin = (session) => session?.user?.role === 'SUPER_ADMIN';

export const fallbackSummary = {
  totalExecutions: 0,
  passRate: 0,
  failRate: 0,
  queuedExecutions: 0,
  runningExecutions: 0
};

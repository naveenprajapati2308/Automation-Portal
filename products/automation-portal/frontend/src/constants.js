export const USER_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Gauge' },
  { key: 'execution', label: 'Execution Center', icon: 'Play' },
  { key: 'reports', label: 'Reports Center', icon: 'FileText' },
  { key: 'logs', label: 'Test Logs', icon: 'TerminalSquare' },
  { key: 'screenshots', label: 'Screenshots', icon: 'Camera' },
  { key: 'compare', label: 'Historical Compare', icon: 'GitCompare' },
  { key: 'environments', label: 'Environments', icon: 'Globe2' }
];

export const fallbackSummary = {
  totalExecutions: 0,
  passRate: 0,
  failRate: 0,
  queuedExecutions: 0,
  runningExecutions: 0
};

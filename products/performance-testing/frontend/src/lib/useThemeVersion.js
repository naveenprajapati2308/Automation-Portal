// Re-export: the implementation now lives in shared/ui/dashboard so Shell and
// Automation (which also render Chart.js canvases now) share the same hook.
export { useThemeVersion } from '../../../../../shared/ui/dashboard/useThemeVersion.js';

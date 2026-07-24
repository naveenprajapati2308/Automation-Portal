import Editor from '@monaco-editor/react';
import { useThemeVersion } from '../lib/useThemeVersion.js';

// Monaco doesn't read CSS variables — it needs an explicit theme name. This
// was hardcoded to `vs-dark` in 4 files regardless of the app's own theme;
// now it follows the same data-theme attribute everything else does.
export function ThemedEditor(props) {
  useThemeVersion();
  const isDark = document.documentElement.dataset.theme === 'dark';
  return <Editor theme={isDark ? 'vs-dark' : 'light'} {...props} />;
}

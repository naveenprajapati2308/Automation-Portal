import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../shared/ui/theme.css';
import './styles.css';
import App from './App.jsx';

// The browser's native scroll restoration tries to put a reloaded page back
// where it was scrolled to before the refresh — but that fights the app's
// own "always land at the top" behavior and shows up as an unwanted jump a
// moment after the page has already painted. Take manual control instead.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

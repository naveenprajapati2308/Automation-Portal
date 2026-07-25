import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../shared/ui/theme.css';
import './styles.css';
import App from './App.jsx';
import { bootstrapSearch } from './search/searchBootstrap.js';

// Initialise the global search engine before React renders.
// Registers all providers and warms up the item cache in the background.
bootstrapSearch();

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

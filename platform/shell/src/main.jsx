import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../shared/ui/theme.css';
import './styles.css';
import App from './App.jsx';
import { bootstrapSearch } from './search/searchBootstrap.js';


bootstrapSearch();


if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

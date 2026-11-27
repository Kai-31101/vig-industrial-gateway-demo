import React from 'react';
import ReactDOM from 'react-dom/client';
// Stylesheet cascade, lowest to highest precedence. Order is deliberate; see outputs/claude-ui-review-2026-11-17/implementation-notes.md.
// 1. Shared tokens, font faces and focus/reduced-motion rules.
import './theme.css';
// 2. Legacy admin component rules (historically loaded before the public sheet via App).
import './admin/admin.css';
// 3. App and feature component sheets (AiChat, HomeAds, packages, maps) load with App.
import App from './App';
// 4. Public layout, mobile overrides, then the admin workspace shell.
import './styles.css';
import './mobile.css';
import './admin/workspace.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);

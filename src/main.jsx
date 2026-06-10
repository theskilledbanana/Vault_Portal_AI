// Global error handler for debugging white screen - MUST BE FIRST
window.onerror = (msg, url, line, col, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color:#ef4444; background:#0f172a; padding:40px; font-family:sans-serif; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); padding:32px; border-radius:24px; max-width:600px; width:100%;">
        <h1 style="font-size:24px; font-weight:900; margin-bottom:16px; color:#ef4444;">CRITICAL_SYSTEM_ERROR</h1>
        <p style="font-size:14px; opacity:0.8; margin-bottom:24px; color:#fff;">${msg}</p>
        <pre style="font-size:12px; background:rgba(0,0,0,0.4); padding:20px; border-radius:12px; overflow:auto; color:rgba(255,255,255,0.6); max-height:300px;">${error?.stack || 'No stack trace available'}</pre>
        <button onclick="location.reload()" style="margin-top:24px; background:#ef4444; color:white; border:none; padding:12px 24px; border-radius:12px; font-weight:bold; cursor:pointer;">Retry Connection</button>
      </div>
    </div>`;
  }
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <App />
);

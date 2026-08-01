import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  // On a first-ever visit the worker takes control mid-session. That first
  // claim is not a version change and must not trigger a reload — but every
  // handover after it is a new build replacing the running one.
  let controlled = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('/Olistic/sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update();

    // Reopening an installed PWA frequently resumes the existing document
    // instead of navigating, so page load alone is not a reliable moment to
    // look for a new build — the app can sit on an old bundle indefinitely.
    // Re-check every time it comes back to the foreground.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });
  });

  // The worker calls skipWaiting(), so a new build takes control as soon as it
  // installs — but this document is still running the old bundle. Reload once
  // to pick up the new assets.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

// Capture the beforeinstallprompt event for in-app install button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
  window.dispatchEvent(new Event('pwainstallready'));
});

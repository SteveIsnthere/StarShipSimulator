// The stylesheet first, so tokens and fonts apply to the very first paint.
import './ui/shell/index.css';
import { createRoot } from 'react-dom/client';
import { App } from '$ui/shell/App';
import { createOfflineSupport } from '$app/offline';

const target = document.getElementById('app');
if (!target) throw new Error('#app mount point missing from index.html');

// No StrictMode: its double-mounted effects would mount the session twice, and
// the session owns the audio context and the render loop for the page's life.
createRoot(target).render(<App />);

// Not awaited: the simulator never waits on a service worker to draw its first
// frame. In dev there is no sw.js, and the failed registration is ignored.
if (import.meta.env.PROD) void createOfflineSupport().register();

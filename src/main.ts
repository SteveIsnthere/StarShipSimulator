import { mount } from 'svelte';
// The design tokens and the @font-face declarations, before anything renders.
// Imported here rather than from a component so it is in the entry chunk's CSS
// and applies to the very first paint — a component-scoped import would arrive
// with that component and flash the fallback stack on the way in.
import './ui/theme.css';
import App from '$ui/App.svelte';
import { createOfflineSupport } from '$app/offline';

const target = document.getElementById('app');
if (!target) throw new Error('#app mount point missing from index.html');

const app = mount(App, { target });

// After mount, and not awaited: the simulator must not wait on a service worker
// to draw its first frame. In dev there is no sw.js to register, so the
// registration simply fails and is ignored — which is the same path a browser
// that refuses service workers takes.
if (import.meta.env.PROD) void createOfflineSupport().register();

export default app;

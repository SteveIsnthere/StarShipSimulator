import { mount } from 'svelte';
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

// The lightweight half of the motion module: timing tokens and the reduced-motion
// signal, used by the app shell and menus. It must never import GSAP — the shell
// is on every page's first download (FB-159). Timelines, effects and the GSAP
// plugins live in `@ui/motion/timeline`, imported only where a beat actually plays.
export * from './tokens';
export * from './useReducedMotion';
export * from './pageTransitionParts';

// The GSAP half of the motion module: shared effects and the scoped timeline hook.
// Import this only from code that plays a beat, so GSAP stays out of the shell's
// first download (FB-159). Tokens and reduced motion come from `@ui/motion`.
export * from './effects';
export * from './useMotionTimeline';
export * from './useChipPanelMorph';
export * from './pageTransition';

import confetti from 'canvas-confetti';

/** Celebration burst in SolarMitra colours; skipped for reduced-motion users. */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ffbf20', '#259862', '#ffffff', '#49b47f', '#ffd24a'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors, zIndex: 9999 });
  window.setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 9999 }), 250);
  window.setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 9999 }), 400);
}

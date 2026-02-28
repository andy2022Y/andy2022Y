export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (x, y) => {
  const m = Math.hypot(x, y) || 1;
  return { x: x / m, y: y / m };
};
export const circleHit = (a, ar, b, br) => dist(a, b) <= ar + br;
export const worldToScreen = (x, y, cam) => ({ x: x - cam.x, y: y - cam.y });

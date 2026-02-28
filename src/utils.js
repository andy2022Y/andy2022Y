export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (x, y) => {
  const len = Math.hypot(x, y);
  if (!len) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
};

export const randomRange = (min, max) => Math.random() * (max - min) + min;

export const circleCollision = (a, b) => distance(a, b) < a.r + b.r;

export const uid = () => Math.random().toString(36).slice(2, 9);

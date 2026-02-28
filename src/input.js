export function createInput(canvas) {
  const st = { keys: new Set(), mouse: { x: 0, y: 0, down: false }, justPressed: false };

  addEventListener('keydown', (e) => {
    st.keys.add(e.key.toLowerCase());
    if (['1', '2', '3', 'i', 'e', 'f'].includes(e.key.toLowerCase())) st.justPressed = true;
  });
  addEventListener('keyup', (e) => st.keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    st.mouse.x = e.clientX - r.left;
    st.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', () => { st.mouse.down = true; });
  addEventListener('mouseup', () => { st.mouse.down = false; });

  return st;
}

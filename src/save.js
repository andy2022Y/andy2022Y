const KEY = 'rpg2d-save-v1';

export const saveGame = (state) => {
  const payload = {
    player: state.player,
    world: state.world,
    time: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  state.lastSave = Date.now();
};

export const loadGame = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

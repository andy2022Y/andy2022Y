const KEY = 'rpg-topdown-save-v1';

export function saveGame(state) {
  const payload = {
    player: state.player,
    quest: state.quest,
    world: {
      herbNodes: state.herbNodes.filter((h) => !h.collected),
      enemies: state.enemies,
      time: Date.now(),
    },
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const KEY = 'rpg-topdown-save-v1';

function buildPersistentPlayer(player) {
  return {
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    mana: player.mana,
    maxMana: player.maxMana,
    gold: player.gold,
    weapon: player.weapon,
    inventory: {
      potion: player.inventory?.potion || 0,
      herb: player.inventory?.herb || 0,
      letter: Boolean(player.inventory?.letter),
    },
  };
}

export function saveGame(state) {
  const payload = {
    player: buildPersistentPlayer(state.player),
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

export function createUI(state, actions) {
  const stats = document.getElementById('stats');
  const weapon = document.getElementById('weapon');
  const quests = document.getElementById('quests');
  const log = document.getElementById('log');
  const shop = document.getElementById('shop');

  document.getElementById('usePotion').addEventListener('click', actions.usePotion);
  document.getElementById('manualSave').addEventListener('click', actions.manualSave);
  document.getElementById('buyPotion').addEventListener('click', actions.buyPotion);
  document.getElementById('closeShop').addEventListener('click', () => actions.toggleShop(false));

  return {
    setShopOpen(open) {
      shop.style.display = open ? 'block' : 'none';
    },
    addLog(text) {
      state.logs.unshift(text);
      state.logs = state.logs.slice(0, 4);
    },
    render() {
      const p = state.player;
      stats.innerHTML = `<strong>HP</strong> ${Math.round(p.hp)}/${p.maxHp} | <strong>Mana</strong> ${Math.round(p.mana)}/${p.maxMana}<br>
      <strong>Gold</strong> ${p.gold} | <strong>Poções</strong> ${p.inventory.potion} | <strong>Ervas</strong> ${p.inventory.herb}`;
      weapon.innerHTML = `<strong>Arma:</strong> ${p.weapon.toUpperCase()} (1/2/3)`;

      quests.innerHTML = '<strong>Quests</strong><br>' + state.quest.order.map((id) => {
        const q = state.quest.byId[id];
        const done = q.complete ? '✅' : '⏳';
        return `${done} ${q.id}: ${q.name} (${q.progress}/${q.goal})`;
      }).join('<br>');

      log.innerHTML = '<strong>Log</strong><br>' + state.logs.join('<br>');
    },
  };
}

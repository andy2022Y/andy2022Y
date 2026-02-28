export function drawUI(ctx, game) {
  const { player, world, showInventory, showShop, questLog } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,18,0.72)';
  ctx.fillRect(8, 8, 320, 105);
  ctx.fillStyle = '#e8f0ff';
  ctx.font = '14px Arial';
  ctx.fillText(`HP: ${Math.round(player.hp)}/${player.maxHp}`, 16, 28);
  ctx.fillText(`Mana: ${Math.round(player.mana)}/${player.maxMana}`, 16, 48);
  ctx.fillText(`Gold: ${player.gold} | Potions: ${player.inventory.potion}`, 16, 68);
  ctx.fillText(`Modo [1/2/3]: ${player.mode.toUpperCase()}`, 16, 88);
  const since = game.lastSave ? `${Math.floor((Date.now() - game.lastSave) / 1000)}s` : '-';
  ctx.fillText(`Último save: ${since}`, 16, 108);

  drawQuestPanel(ctx, questLog);
  drawMiniMap(ctx, game);
  if (showInventory) drawInventory(ctx, player);
  if (showShop) drawShop(ctx);
  ctx.restore();
}

function drawQuestPanel(ctx, questLog) {
  ctx.fillStyle = 'rgba(8,12,18,0.72)';
  ctx.fillRect(8, 120, 350, 100);
  ctx.fillStyle = '#c9dcff';
  ctx.fillText('Quests:', 16, 140);
  let y = 160;
  for (const q of questLog) {
    ctx.fillStyle = q.status === 'done' ? '#9cff9c' : q.status === 'active' ? '#ffe89a' : '#8a9bb7';
    ctx.fillText(`${q.name}: ${q.progress}/${q.goal} (${q.status})`, 16, y);
    y += 20;
  }
}

function drawInventory(ctx, player) {
  ctx.fillStyle = 'rgba(10,17,26,0.9)';
  ctx.fillRect(360, 200, 240, 150);
  ctx.fillStyle = '#ecf3ff';
  ctx.fillText('Inventário (I para fechar)', 375, 225);
  ctx.fillText(`Poções: ${player.inventory.potion}`, 375, 255);
  ctx.fillText(`Herbs: ${player.inventory.herb}`, 375, 280);
  ctx.fillText(`Carta: ${player.inventory.letter ? 'Sim' : 'Não'}`, 375, 305);
  ctx.fillText('Pressione F para usar poção', 375, 330);
}

function drawShop(ctx) {
  ctx.fillStyle = 'rgba(10,17,26,0.9)';
  ctx.fillRect(610, 200, 320, 130);
  ctx.fillStyle = '#ecf3ff';
  ctx.fillText('Loja (E para comprar poção por 12g)', 626, 230);
  ctx.fillText('Aproxime-se do Merchant para abrir/fechar', 626, 260);
}

function drawMiniMap(ctx, game) {
  const { world, player } = game;
  const x = 790;
  const y = 10;
  const w = 160;
  const h = 120;
  ctx.fillStyle = 'rgba(7,11,17,0.78)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#456';
  ctx.strokeRect(x, y, w, h);

  const sx = w / 2400;
  const sy = h / 1800;
  ctx.fillStyle = '#4ec94e';
  for (const e of world.enemies) ctx.fillRect(x + e.x * sx, y + e.y * sy, 2, 2);
  ctx.fillStyle = '#59d3ff';
  for (const n of world.npcs) ctx.fillRect(x + n.x * sx, y + n.y * sy, 3, 3);
  ctx.fillStyle = '#f7e56d';
  ctx.fillRect(x + player.x * sx - 2, y + player.y * sy - 2, 4, 4);
}

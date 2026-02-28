import { WORLD, ENEMY_TYPES, WEAPONS, QUESTS, NPCS } from './data.js';
import { clamp, normalize, randomRange, distance, circleCollision, uid } from './utils.js';
import { saveGame, loadGame } from './save.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const miniCtx = minimap.getContext('2d');

const state = {
  camera: { x: 0, y: 0 },
  logs: ['Bem-vindo ao HUB. Fale com o Ancião (E).'],
  shopOpen: false,
  player: {
    x: 380,
    y: 420,
    r: 16,
    speed: 230,
    hp: 100,
    maxHp: 100,
    mana: 70,
    maxMana: 70,
    gold: 12,
    weapon: 'melee',
    inventory: { potion: 2, herb: 0, letter: false },
    attackCd: 0,
    invuln: 0,
  },
  enemies: [],
  projectiles: [],
  loot: [],
  herbNodes: [],
  quest: {
    order: QUESTS.map((q) => q.id),
    byId: Object.fromEntries(QUESTS.map((q) => [q.id, { ...q, progress: 0, complete: false, started: q.id === 'Q1' }])),
  },
};

const input = createInput(canvas);
const ui = createUI(state, {
  usePotion,
  manualSave: () => {
    saveGame(state);
    ui.addLog('Jogo salvo manualmente.');
  },
  buyPotion,
  toggleShop(open) {
    state.shopOpen = open;
    ui.setShopOpen(open);
  },
});

initWorld();
loadIfPossible();
let last = performance.now();
setInterval(() => {
  saveGame(state);
  ui.addLog('Autosave executado.');
}, 20000);
requestAnimationFrame(loop);

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === '1') state.player.weapon = 'melee';
  if (k === '2') state.player.weapon = 'ranged';
  if (k === '3') state.player.weapon = 'magic';
  if (k === 'p') usePotion();
  if (k === 'e') interactNPC();
});

function initWorld() {
  for (let i = 0; i < 18; i += 1) {
    spawnEnemy('rat');
  }
  for (let i = 0; i < 10; i += 1) {
    state.herbNodes.push({
      id: uid(),
      x: randomRange(820, WORLD.width - 140),
      y: randomRange(250, WORLD.height - 120),
      r: 10,
      collected: false,
    });
  }
}

function spawnEnemy(type) {
  const base = ENEMY_TYPES[type];
  state.enemies.push({
    id: uid(),
    type,
    x: randomRange(750, WORLD.width - 100),
    y: randomRange(220, WORLD.height - 100),
    r: 14,
    hp: base.hp,
    maxHp: base.hp,
    cooldown: 0,
    wanderDir: Math.random() * Math.PI * 2,
    wanderTime: randomRange(1, 3),
  });
}

function loadIfPossible() {
  const data = loadGame();
  if (!data) return;
  const safePlayer = data.player || {};
  Object.assign(state.player, {
    x: safePlayer.x ?? state.player.x,
    y: safePlayer.y ?? state.player.y,
    hp: clamp(safePlayer.hp ?? state.player.hp, 1, state.player.maxHp),
    maxHp: safePlayer.maxHp ?? state.player.maxHp,
    mana: clamp(safePlayer.mana ?? state.player.mana, 0, state.player.maxMana),
    maxMana: safePlayer.maxMana ?? state.player.maxMana,
    gold: Math.max(0, safePlayer.gold ?? state.player.gold),
    weapon: ['melee', 'ranged', 'magic'].includes(safePlayer.weapon) ? safePlayer.weapon : state.player.weapon,
    inventory: {
      potion: Math.max(0, safePlayer.inventory?.potion ?? state.player.inventory.potion),
      herb: Math.max(0, safePlayer.inventory?.herb ?? state.player.inventory.herb),
      letter: Boolean(safePlayer.inventory?.letter),
    },
    attackCd: 0,
    invuln: 0,
  });

  if (data.quest?.byId && data.quest?.order) state.quest = data.quest;
  state.herbNodes = (data.world?.herbNodes || state.herbNodes).map((h) => ({ ...h, collected: false }));
  state.enemies = data.world?.enemies?.length ? data.world.enemies : state.enemies;

  refreshQuestUnlocks();
  syncHerbQuestProgress();
  ui.addLog('Save carregado com sucesso.');
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  const p = state.player;
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.mana = clamp(p.mana + dt * 4, 0, p.maxMana);

  let mx = 0;
  let my = 0;
  if (input.isDown('w', 'arrowup')) my -= 1;
  if (input.isDown('s', 'arrowdown')) my += 1;
  if (input.isDown('a', 'arrowleft')) mx -= 1;
  if (input.isDown('d', 'arrowright')) mx += 1;

  const dir = normalize(mx, my);
  p.x = clamp(p.x + dir.x * p.speed * dt, p.r, WORLD.width - p.r);
  p.y = clamp(p.y + dir.y * p.speed * dt, p.r, WORLD.height - p.r);

  if (input.consumeClick()) performAttack();

  for (const enemy of state.enemies) {
    updateEnemy(enemy, dt);
  }

  for (const proj of state.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;
    if (proj.x < 0 || proj.y < 0 || proj.x > WORLD.width || proj.y > WORLD.height) proj.life = 0;

    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && circleCollision({ ...proj, r: proj.r }, enemy)) {
        enemy.hp -= proj.damage;
        proj.life = 0;
      }
    }
  }
  state.projectiles = state.projectiles.filter((p2) => p2.life > 0);

  for (const herb of state.herbNodes) {
    if (!herb.collected && distance(p, herb) < p.r + herb.r + 6) {
      herb.collected = true;
      p.inventory.herb += 1;
      syncHerbQuestProgress();
      ui.addLog('Você coletou uma erva.');
    }
  }

  for (const drop of state.loot) {
    if (!drop.picked && distance(p, drop) < p.r + drop.r + 4) {
      drop.picked = true;
      if (drop.kind === 'gold') p.gold += drop.amount;
      if (drop.kind === 'potion') p.inventory.potion += 1;
      ui.addLog(`Loot: ${drop.kind === 'gold' ? `${drop.amount} gold` : 'poção'}`);
    }
  }
  state.loot = state.loot.filter((d) => !d.picked);

  state.enemies = state.enemies.filter((e) => {
    if (e.hp > 0) return true;
    onEnemyKilled(e);
    return false;
  });
  if (state.enemies.length < 12) spawnEnemy('rat');

  state.camera.x = clamp(p.x - canvas.width / 2, 0, WORLD.width - canvas.width);
  state.camera.y = clamp(p.y - canvas.height / 2, 0, WORLD.height - canvas.height);

  ui.render();
}

function updateEnemy(enemy, dt) {
  const p = state.player;
  const cfg = ENEMY_TYPES[enemy.type];
  const d = distance(enemy, p);
  let vx = 0;
  let vy = 0;

  if (d < cfg.aggro) {
    const dir = normalize(p.x - enemy.x, p.y - enemy.y);
    vx = dir.x * cfg.speed;
    vy = dir.y * cfg.speed;
  } else {
    enemy.wanderTime -= dt;
    if (enemy.wanderTime <= 0) {
      enemy.wanderTime = randomRange(0.8, 2.4);
      enemy.wanderDir = randomRange(0, Math.PI * 2);
    }
    vx = Math.cos(enemy.wanderDir) * cfg.speed * 0.45;
    vy = Math.sin(enemy.wanderDir) * cfg.speed * 0.45;
  }

  enemy.x = clamp(enemy.x + vx * dt, enemy.r, WORLD.width - enemy.r);
  enemy.y = clamp(enemy.y + vy * dt, enemy.r, WORLD.height - enemy.r);

  enemy.cooldown = Math.max(0, enemy.cooldown - dt);
  if (d < enemy.r + p.r + 2 && enemy.cooldown <= 0 && p.invuln <= 0) {
    p.hp = clamp(p.hp - cfg.touchDamage, 0, p.maxHp);
    p.invuln = 0.5;
    enemy.cooldown = 1;
    if (p.hp <= 0) {
      respawnPlayer();
      ui.addLog('Você caiu em combate e voltou ao HUB.');
    }
  }
}

function performAttack() {
  const p = state.player;
  const w = WEAPONS[p.weapon];
  if (p.attackCd > 0) return;
  if (w.manaCost > p.mana) {
    ui.addLog('Mana insuficiente.');
    return;
  }
  p.attackCd = w.cooldown;
  p.mana -= w.manaCost;

  const tx = input.mouse.x + state.camera.x;
  const ty = input.mouse.y + state.camera.y;
  const dir = normalize(tx - p.x, ty - p.y);

  if (p.weapon === 'melee') {
    for (const enemy of state.enemies) {
      if (distance(p, enemy) <= w.range) enemy.hp -= w.damage;
    }
    return;
  }

  state.projectiles.push({
    x: p.x + dir.x * 18,
    y: p.y + dir.y * 18,
    vx: dir.x * w.speed,
    vy: dir.y * w.speed,
    r: p.weapon === 'magic' ? 7 : 5,
    life: 2,
    damage: w.damage,
    mode: p.weapon,
  });
}

function onEnemyKilled(enemy) {
  if (enemy.type === 'rat') progressQuest('Q1', 1);
  const cfg = ENEMY_TYPES[enemy.type];
  const gold = Math.round(randomRange(cfg.goldDrop[0], cfg.goldDrop[1]));
  state.loot.push({ id: uid(), x: enemy.x, y: enemy.y, r: 7, kind: 'gold', amount: gold });
  if (Math.random() < cfg.potionChance) {
    state.loot.push({ id: uid(), x: enemy.x + 10, y: enemy.y + 4, r: 7, kind: 'potion', amount: 1 });
  }
}

function progressQuest(id, amount) {
  const q = state.quest.byId[id];
  if (!q || !q.started || q.complete) return;
  q.progress = clamp(q.progress + amount, 0, q.goal);
  if (q.progress >= q.goal) {
    q.complete = true;
    ui.addLog(`Quest concluída: ${q.name}`);
    if (id === 'Q1') {
      state.quest.byId.Q2.started = true;
      syncHerbQuestProgress();
    }
    if (id === 'Q2') state.quest.byId.Q3.started = true;
  }
}

function syncHerbQuestProgress() {
  const q2 = state.quest.byId.Q2;
  if (!q2 || !q2.started || q2.complete) return;

  const target = clamp(state.player.inventory.herb, 0, q2.goal);
  if (target > q2.progress) {
    q2.progress = target;
    if (q2.progress >= q2.goal) {
      q2.complete = true;
      ui.addLog(`Quest concluída: ${q2.name}`);
      state.quest.byId.Q3.started = true;
    }
  }
}

function refreshQuestUnlocks() {
  if (state.quest.byId.Q1?.complete) state.quest.byId.Q2.started = true;
  if (state.quest.byId.Q2?.complete) state.quest.byId.Q3.started = true;
}

function interactNPC() {
  const p = state.player;
  const near = NPCS.find((n) => distance(p, n) < 50);
  if (!near) return;

  if (near.id === 'elder') {
    const q1 = state.quest.byId.Q1;
    const q2 = state.quest.byId.Q2;
    const q3 = state.quest.byId.Q3;
    if (!q1.complete) ui.addLog('Ancião: elimine 5 ratos.');
    else if (!q2.complete) ui.addLog('Ancião: agora colete 3 ervas.');
    else if (!p.inventory.letter) {
      p.inventory.letter = true;
      ui.addLog('Ancião: entregue esta carta ao Mercador.');
    } else if (!q3.complete) {
      ui.addLog('Ancião: fale com o Mercador para concluir a entrega.');
    } else {
      ui.addLog('Ancião: grande herói do HUB!');
    }
  }

  if (near.id === 'merchant') {
    if (state.player.inventory.letter && !state.quest.byId.Q3.complete) {
      state.player.inventory.letter = false;
      progressQuest('Q3', 1);
      ui.addLog('Mercador: carta recebida!');
    }
    state.shopOpen = !state.shopOpen;
    ui.setShopOpen(state.shopOpen);
  }

  if (near.id === 'guard') ui.addLog('Guarda: mantenha-se forte lá fora.');
}

function buyPotion() {
  if (state.player.gold < 10) {
    ui.addLog('Gold insuficiente.');
    return;
  }
  state.player.gold -= 10;
  state.player.inventory.potion += 1;
  ui.addLog('Você comprou uma poção.');
}

function usePotion() {
  const p = state.player;
  if (p.inventory.potion <= 0) {
    ui.addLog('Você não tem poções.');
    return;
  }
  if (p.hp >= p.maxHp) {
    ui.addLog('HP já está cheio.');
    return;
  }
  p.inventory.potion -= 1;
  p.hp = clamp(p.hp + 35, 0, p.maxHp);
  ui.addLog('Poção consumida.');
}

function respawnPlayer() {
  const p = state.player;
  p.hp = p.maxHp;
  p.mana = p.maxMana;
  p.x = 380;
  p.y = 420;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawHub();
  drawHerbs();
  drawLoot();
  drawNPCs();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawMinimap();
}

function screenPos(worldObj) {
  return { x: worldObj.x - state.camera.x, y: worldObj.y - state.camera.y };
}

function drawGround() {
  ctx.fillStyle = '#2d6b37';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 130; i += 1) {
    const x = ((i * 93) % WORLD.width) - state.camera.x;
    const y = ((i * 57) % WORLD.height) - state.camera.y;
    ctx.fillStyle = i % 2 ? '#355f2c' : '#477f3f';
    ctx.beginPath();
    ctx.arc(x, y, 18 + (i % 7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHub() {
  const h = WORLD.hub;
  ctx.fillStyle = '#687c5b';
  ctx.fillRect(h.x - state.camera.x, h.y - state.camera.y, h.w, h.h);
  ctx.strokeStyle = '#8fa77d';
  ctx.strokeRect(h.x - state.camera.x, h.y - state.camera.y, h.w, h.h);
}

function drawPlayer() {
  const p = state.player;
  const pos = screenPos(p);
  ctx.fillStyle = p.invuln > 0 ? '#ffd2d2' : '#68c4ff';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, p.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  for (const e of state.enemies) {
    const pos = screenPos(e);
    ctx.fillStyle = ENEMY_TYPES[e.type].color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    const pos = screenPos(p);
    ctx.fillStyle = p.mode === 'magic' ? '#68e9ff' : '#ffd169';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot() {
  for (const d of state.loot) {
    const pos = screenPos(d);
    ctx.fillStyle = d.kind === 'gold' ? '#f0cf48' : '#ff5ba3';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHerbs() {
  for (const h of state.herbNodes) {
    if (h.collected) continue;
    const pos = screenPos(h);
    ctx.fillStyle = '#2aff66';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, h.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNPCs() {
  for (const n of NPCS) {
    const pos = screenPos(n);
    ctx.fillStyle = n.id === 'merchant' ? '#f1b268' : '#d8e3ff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#121';
    ctx.fillText(n.name, pos.x - 28, pos.y - 18);
  }
}

function drawMinimap() {
  miniCtx.fillStyle = '#102018';
  miniCtx.fillRect(0, 0, minimap.width, minimap.height);

  const sx = minimap.width / WORLD.width;
  const sy = minimap.height / WORLD.height;

  miniCtx.fillStyle = '#446a44';
  miniCtx.fillRect(WORLD.hub.x * sx, WORLD.hub.y * sy, WORLD.hub.w * sx, WORLD.hub.h * sy);

  miniCtx.fillStyle = '#ffcc66';
  for (const e of state.enemies.slice(0, 50)) {
    miniCtx.fillRect(e.x * sx, e.y * sy, 2, 2);
  }

  miniCtx.fillStyle = '#57ff93';
  for (const h of state.herbNodes) {
    if (!h.collected) miniCtx.fillRect(h.x * sx, h.y * sy, 2, 2);
  }

  miniCtx.fillStyle = '#6ed0ff';
  miniCtx.fillRect(state.player.x * sx - 2, state.player.y * sy - 2, 4, 4);
}

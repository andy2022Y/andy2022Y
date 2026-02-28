import { clamp, norm, dist, circleHit, worldToScreen } from './utils.js';
import { WORLD, hub, makePlayer, makeWorld } from './data.js';
import { saveGame, loadGame } from './save.js';
import { createInput } from './input.js';
import { drawUI } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const loaded = loadGame();
const game = loaded
  ? { player: loaded.player, world: loaded.world, showInventory: false, showShop: false, lastSave: loaded.time }
  : { player: makePlayer(), world: makeWorld(), showInventory: false, showShop: false, lastSave: 0 };

game.questLog = Object.values(game.world.quests);

setInterval(() => saveGame(game), 20000);
document.getElementById('saveBtn').onclick = () => saveGame(game);

let last = performance.now();
requestAnimationFrame(loop);

function loop(ts) {
  const dt = Math.min(0.032, (ts - last) / 1000);
  last = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  const p = game.player;
  const k = input.keys;

  if (k.has('1')) p.mode = 'melee';
  if (k.has('2')) p.mode = 'ranged';
  if (k.has('3')) p.mode = 'magic';
  if (k.has('i') && input.justPressed) game.showInventory = !game.showInventory;

  let dx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
  let dy = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
  if (dx || dy) {
    const n = norm(dx, dy);
    p.facing = n;
    p.x += n.x * p.speed * dt;
    p.y += n.y * p.speed * dt;
  }
  p.x = clamp(p.x, p.r, WORLD.w - p.r);
  p.y = clamp(p.y, p.r, WORLD.h - p.r);

  if (p.cooldown > 0) p.cooldown -= dt;
  p.mana = clamp(p.mana + 9 * dt, 0, p.maxMana);

  if (k.has('f') && input.justPressed && p.inventory.potion > 0) {
    p.inventory.potion -= 1;
    p.hp = clamp(p.hp + 35, 0, p.maxHp);
  }

  const cam = { x: clamp(p.x - canvas.width / 2, 0, WORLD.w - canvas.width), y: clamp(p.y - canvas.height / 2, 0, WORLD.h - canvas.height) };
  const mx = input.mouse.x + cam.x;
  const my = input.mouse.y + cam.y;

  if (input.mouse.down && p.cooldown <= 0) doAttack(mx, my);

  updateProjectiles(dt);
  updateEnemies(dt);
  updateLoot();
  updateHerbs();
  updateNpcInteractions();

  input.justPressed = false;
}

function doAttack(tx, ty) {
  const p = game.player;
  const dir = norm(tx - p.x, ty - p.y);
  p.facing = dir;

  if (p.mode === 'melee') {
    p.cooldown = 0.38;
    for (const e of game.world.enemies) {
      const close = dist(p, e) < 44;
      const front = (e.x - p.x) * dir.x + (e.y - p.y) * dir.y > 0;
      if (close && front) hurtEnemy(e, 18);
    }
    return;
  }

  if (p.mode === 'ranged') {
    p.cooldown = 0.52;
    game.world.projectiles.push({ x: p.x, y: p.y, vx: dir.x * 380, vy: dir.y * 380, dmg: 13, ttl: 1.5, kind: 'arrow' });
    return;
  }

  if (p.mana >= 20) {
    p.cooldown = 0.7;
    p.mana -= 20;
    game.world.projectiles.push({ x: p.x, y: p.y, vx: dir.x * 260, vy: dir.y * 260, dmg: 20, ttl: 1.3, kind: 'orb', aoe: 45 });
  }
}

function hurtEnemy(enemy, dmg) {
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    const q1 = game.world.quests.q1;
    if (q1.status === 'active') {
      q1.progress += 1;
      if (q1.progress >= q1.goal) {
        q1.status = 'done';
        game.world.quests.q2.status = 'active';
      }
    }
    dropLoot(enemy.x, enemy.y);
    game.world.enemies = game.world.enemies.filter((e) => e !== enemy);
  }
}

function updateProjectiles(dt) {
  const list = game.world.projectiles;
  for (const p of list) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttl -= dt;

    for (const e of game.world.enemies) {
      if (circleHit(p, 4, e, e.r)) {
        hurtEnemy(e, p.dmg);
        if (p.aoe) {
          for (const other of game.world.enemies) if (dist(other, p) < p.aoe) hurtEnemy(other, Math.floor(p.dmg * 0.6));
        }
        p.ttl = 0;
        break;
      }
    }
  }
  game.world.projectiles = list.filter((p) => p.ttl > 0 && p.x >= 0 && p.y >= 0 && p.x <= WORLD.w && p.y <= WORLD.h);
}

function updateEnemies(dt) {
  const p = game.player;
  for (const e of game.world.enemies) {
    const d = dist(e, p);
    if (d < 210) e.aggro = 3;
    e.aggro -= dt;
    if (e.aggro > 0) {
      const n = norm(p.x - e.x, p.y - e.y);
      e.x += n.x * e.speed * dt;
      e.y += n.y * e.speed * dt;
    }
    e.hitCd = Math.max(0, e.hitCd - dt);
    if (d < 22 && e.hitCd <= 0) {
      p.hp -= 7;
      e.hitCd = 0.9;
      if (p.hp <= 0) {
        p.hp = p.maxHp;
        p.x = hub.x + hub.w / 2;
        p.y = hub.y + hub.h + 45;
      }
    }
  }
}

function dropLoot(x, y) {
  const gold = 5 + Math.floor(Math.random() * 10);
  game.world.loot.push({ x, y, r: 7, kind: 'gold', amount: gold });
  if (Math.random() < 0.25) game.world.loot.push({ x: x + 8, y: y + 5, r: 7, kind: 'potion', amount: 1 });
}

function updateLoot() {
  const p = game.player;
  game.world.loot = game.world.loot.filter((l) => {
    if (circleHit(p, p.r, l, l.r + 4)) {
      if (l.kind === 'gold') p.gold += l.amount;
      if (l.kind === 'potion') p.inventory.potion += 1;
      return false;
    }
    return true;
  });
}

function updateHerbs() {
  const p = game.player;
  const q2 = game.world.quests.q2;
  for (const h of game.world.herbs) {
    if (!h.picked && circleHit(p, p.r, h, h.r) && q2.status === 'active') {
      h.picked = true;
      p.inventory.herb += 1;
      q2.progress += 1;
      if (q2.progress >= q2.goal) {
        q2.status = 'done';
        game.world.quests.q3.status = 'active';
      }
    }
  }
}

function updateNpcInteractions() {
  const p = game.player;
  game.showShop = false;
  const q3 = game.world.quests.q3;

  for (const n of game.world.npcs) {
    const near = dist(p, n) < 44;
    if (!near) continue;

    if (n.id === 'merchant') {
      game.showShop = true;
      if (input.keys.has('e') && input.justPressed && p.gold >= 12) {
        p.gold -= 12;
        p.inventory.potion += 1;
      }
    }

    if (n.id === 'blacksmith' && q3.status === 'active' && p.inventory.letter) {
      if (input.keys.has('e') && input.justPressed) {
        p.inventory.letter = 0;
        q3.progress = 1;
        q3.status = 'done';
        p.gold += 40;
      }
    }
  }
}

function render() {
  const p = game.player;
  const cam = { x: clamp(p.x - canvas.width / 2, 0, WORLD.w - canvas.width), y: clamp(p.y - canvas.height / 2, 0, WORLD.h - canvas.height) };

  drawGround(cam);
  drawHub(cam);
  drawHerbs(cam);
  drawNpcs(cam);
  drawEnemies(cam);
  drawProjectiles(cam);
  drawLoot(cam);

  const sp = worldToScreen(p.x, p.y, cam);
  ctx.fillStyle = '#f7e56d';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  drawUI(ctx, game);
}

function drawGround(cam) {
  ctx.fillStyle = '#244f2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = -32; y < canvas.height + 32; y += 32) {
    for (let x = -32; x < canvas.width + 32; x += 32) {
      const wx = x + cam.x;
      const wy = y + cam.y;
      const v = ((Math.sin(wx * 0.02) + Math.cos(wy * 0.018)) * 0.5 + 0.5);
      ctx.fillStyle = v > 0.52 ? '#2a5a2f' : '#295227';
      ctx.fillRect(x, y, 33, 33);
    }
  }
}
function drawHub(cam) {
  const s = worldToScreen(hub.x, hub.y, cam);
  ctx.fillStyle = '#5f5b63';
  ctx.fillRect(s.x, s.y, hub.w, hub.h);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(s.x, s.y, hub.w, hub.h);
}
function drawNpcs(cam) {
  for (const n of game.world.npcs) {
    const s = worldToScreen(n.x, n.y, cam);
    ctx.fillStyle = n.id === 'merchant' ? '#78c8ff' : '#ceb7ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, n.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.fillText(n.name, s.x - 22, s.y - 16);
  }
}
function drawEnemies(cam) {
  for (const e of game.world.enemies) {
    const s = worldToScreen(e.x, e.y, cam);
    ctx.fillStyle = '#b16464';
    ctx.beginPath(); ctx.arc(s.x, s.y, e.r, 0, Math.PI * 2); ctx.fill();
  }
}
function drawProjectiles(cam) {
  for (const p of game.world.projectiles) {
    const s = worldToScreen(p.x, p.y, cam);
    ctx.fillStyle = p.kind === 'arrow' ? '#ddd' : '#7ee8ff';
    ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
  }
}
function drawLoot(cam) {
  for (const l of game.world.loot) {
    const s = worldToScreen(l.x, l.y, cam);
    ctx.fillStyle = l.kind === 'gold' ? '#ffde62' : '#ff6cc4';
    ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
  }
}
function drawHerbs(cam) {
  for (const h of game.world.herbs) {
    if (h.picked) continue;
    const s = worldToScreen(h.x, h.y, cam);
    ctx.fillStyle = '#67f07b';
    ctx.fillRect(s.x - 4, s.y - 8, 8, 16);
  }
}

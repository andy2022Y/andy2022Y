import { rand, randInt } from './utils.js';

export const TILE = 32;
export const WORLD = { w: 2400, h: 1800 };

export const hub = { x: 1050, y: 750, w: 300, h: 260 };

export function makePlayer() {
  return {
    x: hub.x + hub.w / 2,
    y: hub.y + hub.h + 40,
    r: 12,
    speed: 220,
    hp: 100,
    maxHp: 100,
    mana: 80,
    maxMana: 80,
    gold: 20,
    facing: { x: 0, y: 1 },
    mode: 'melee',
    cooldown: 0,
    inventory: { potion: 1, herb: 0, letter: 1 },
  };
}

export function makeWorld() {
  const enemies = [];
  for (let i = 0; i < 18; i += 1) {
    enemies.push({
      type: 'rat',
      x: rand(120, WORLD.w - 120),
      y: rand(120, WORLD.h - 120),
      r: 10,
      hp: 28,
      speed: rand(65, 95),
      aggro: 0,
      hitCd: 0,
    });
  }

  const herbs = [];
  for (let i = 0; i < 20; i += 1) {
    herbs.push({ x: randInt(80, WORLD.w - 80), y: randInt(80, WORLD.h - 80), r: 8, picked: false });
  }

  const npcs = [
    { id: 'elder', name: 'Elder', x: hub.x + 60, y: hub.y + 70, r: 13, role: 'quest' },
    { id: 'merchant', name: 'Merchant', x: hub.x + 150, y: hub.y + 180, r: 13, role: 'shop' },
    { id: 'blacksmith', name: 'Blacksmith', x: hub.x + 240, y: hub.y + 70, r: 13, role: 'quest' },
  ];

  const quests = {
    q1: { id: 'q1', name: 'Q1: Matar Rats', goal: 5, progress: 0, status: 'active' },
    q2: { id: 'q2', name: 'Q2: Coletar Herbs', goal: 3, progress: 0, status: 'locked' },
    q3: { id: 'q3', name: 'Q3: Entregar Carta', goal: 1, progress: 0, status: 'locked' },
  };

  return { enemies, herbs, npcs, quests, loot: [], projectiles: [], texts: [] };
}

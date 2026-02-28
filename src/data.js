export const WORLD = {
  width: 2400,
  height: 1800,
  hub: { x: 200, y: 200, w: 500, h: 420 },
};

export const ENEMY_TYPES = {
  rat: {
    hp: 30,
    speed: 70,
    aggro: 220,
    touchDamage: 6,
    color: '#6c5a4d',
    goldDrop: [1, 5],
    potionChance: 0.22,
  },
};

export const WEAPONS = {
  melee: { label: 'Melee', damage: 18, range: 52, cooldown: 0.38, manaCost: 0 },
  ranged: { label: 'Ranged', damage: 14, speed: 380, cooldown: 0.45, manaCost: 0 },
  magic: { label: 'Magic', damage: 24, speed: 320, cooldown: 0.7, manaCost: 12 },
};

export const QUESTS = [
  { id: 'Q1', name: 'Exterminador de Ratos', desc: 'Mate 5 ratos.', goal: 5 },
  { id: 'Q2', name: 'Coletor de Ervas', desc: 'Colete 3 ervas.', goal: 3 },
  { id: 'Q3', name: 'Entrega da Carta', desc: 'Leve a carta até o Mercador.', goal: 1 },
];

export const NPCS = [
  { id: 'elder', name: 'Ancião', x: 320, y: 320, role: 'quest' },
  { id: 'merchant', name: 'Mercador', x: 520, y: 350, role: 'shop' },
  { id: 'guard', name: 'Guarda', x: 410, y: 500, role: 'flavor' },
];

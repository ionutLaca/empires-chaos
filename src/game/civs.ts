export type CivId = 'romani' | 'daci' | 'egipteni' | 'vikingi' | 'atlanti';
export type UnitKind = 'melee' | 'ranged';

export interface UnitStats {
  name: string;
  kind: UnitKind;
  hp: number;
  damage: number;
  armor: number;
  /** Secunde între două atacuri. */
  attackCooldown: number;
  /** Raza de atac (de la marginea unității la marginea țintei). */
  range: number;
  /** Viteza de deplasare (unități de lume pe secundă). */
  speed: number;
  radius: number;
}

export interface CivDef {
  id: CivId;
  name: string;
  color: number;
  css: string;
  bonus: string;
  description: string;
  units: Record<UnitKind, UnitStats>;
  /** Civilizație doar pentru testare: jucătorul o poate alege, dar calculatorul niciodată. */
  testOnly?: boolean;
}

const MELEE_RADIUS = 7;
const RANGED_RADIUS = 6;

export const CIVS: CivDef[] = [
  {
    id: 'romani',
    name: 'Romans',
    color: 0xc0392b,
    css: '#c0392b',
    bonus: 'Scutum: heavily armored infantry',
    description: 'Disciplined legions that hold the front line for a long time.',
    units: {
      melee: { name: 'Legionary', kind: 'melee', hp: 230, damage: 15, armor: 5, attackCooldown: 1.0, range: 6, speed: 52, radius: MELEE_RADIUS },
      ranged: { name: 'Sagittarius', kind: 'ranged', hp: 130, damage: 15, armor: 1, attackCooldown: 1.3, range: 150, speed: 52, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'daci',
    name: 'Dacians',
    color: 0x2e86de,
    css: '#2e86de',
    bonus: 'Falx: devastating melee damage',
    description: 'Fierce warriors whose curved blades cut through shields.',
    units: {
      melee: { name: 'Falx Warrior', kind: 'melee', hp: 205, damage: 25, armor: 1, attackCooldown: 1.0, range: 6, speed: 56, radius: MELEE_RADIUS },
      ranged: { name: 'Dacian Archer', kind: 'ranged', hp: 130, damage: 16, armor: 0, attackCooldown: 1.3, range: 150, speed: 56, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'egipteni',
    name: 'Egyptians',
    color: 0xe1b12c,
    css: '#e1b12c',
    bonus: 'Elite archers: longer range and more ranged damage',
    description: "The pharaoh's archers strike from afar before the enemy can close in.",
    units: {
      melee: { name: 'Khopesh Warrior', kind: 'melee', hp: 220, damage: 18, armor: 2, attackCooldown: 1.0, range: 6, speed: 54, radius: MELEE_RADIUS },
      ranged: { name: 'Egyptian Archer', kind: 'ranged', hp: 125, damage: 15, armor: 0, attackCooldown: 1.25, range: 170, speed: 54, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'vikingi',
    name: 'Vikings',
    color: 0x9b59b6,
    css: '#9b59b6',
    bonus: 'Berserkers: high health and fast attacks',
    description: 'Hardy Norse fighters who never stop swinging.',
    units: {
      melee: { name: 'Berserker', kind: 'melee', hp: 260, damage: 18, armor: 1, attackCooldown: 0.88, range: 6, speed: 58, radius: MELEE_RADIUS },
      ranged: { name: 'Spear Thrower', kind: 'ranged', hp: 150, damage: 17, armor: 1, attackCooldown: 1.4, range: 120, speed: 58, radius: RANGED_RADIUS },
    },
  },
];

/**
 * Civilizație de TEST, intenționat mult prea puternică, ca un meci să se termine în câteva minute.
 * Utilă când vrem să verificăm rapid finalul meciului, ecranele de victorie etc.
 */
CIVS.push({
  id: 'atlanti',
  name: 'Atlanteans',
  color: 0x17c0c0,
  css: '#17c0c0',
  bonus: 'TEST ONLY: overpowered, wins in about a minute',
  description: 'A legendary empire for quick testing. The computer never plays it.',
  testOnly: true,
  units: {
    melee: { name: 'Titan Guard', kind: 'melee', hp: 900, damage: 45, armor: 8, attackCooldown: 0.7, range: 6, speed: 75, radius: MELEE_RADIUS },
    ranged: { name: 'Storm Caller', kind: 'ranged', hp: 450, damage: 35, armor: 4, attackCooldown: 0.9, range: 200, speed: 75, radius: RANGED_RADIUS },
  },
});

/** Civilizațiile adevărate, pe care le poate primi și calculatorul. */
export const PLAYABLE_CIVS: CivDef[] = CIVS.filter((c) => !c.testOnly);

export const CIV_BY_ID: Record<CivId, CivDef> = Object.fromEntries(CIVS.map((c) => [c.id, c])) as Record<CivId, CivDef>;

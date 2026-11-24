export type CivId = 'romani' | 'daci' | 'egipteni' | 'vikingi';
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
  /** Forma de genitiv, pentru mesaje: „castelul Romanilor”. */
  genitive: string;
  color: number;
  css: string;
  bonus: string;
  description: string;
  units: Record<UnitKind, UnitStats>;
}

const MELEE_RADIUS = 7;
const RANGED_RADIUS = 6;

export const CIVS: CivDef[] = [
  {
    id: 'romani',
    name: 'Romani',
    genitive: 'Romanilor',
    color: 0xc0392b,
    css: '#c0392b',
    bonus: 'Scutum: infanterie cu armură foarte mare',
    description: 'Legiuni disciplinate care rezistă mult pe linia frontului.',
    units: {
      melee: { name: 'Legionar', kind: 'melee', hp: 230, damage: 16, armor: 5, attackCooldown: 1.0, range: 6, speed: 52, radius: MELEE_RADIUS },
      ranged: { name: 'Sagittarius', kind: 'ranged', hp: 130, damage: 15, armor: 1, attackCooldown: 1.3, range: 150, speed: 52, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'daci',
    name: 'Daci',
    genitive: 'Dacilor',
    color: 0x2e86de,
    css: '#2e86de',
    bonus: 'Falx: daune foarte mari în luptă corp la corp',
    description: 'Războinici feroce care sparg scuturile cu sabia curbă.',
    units: {
      melee: { name: 'Războinic cu falx', kind: 'melee', hp: 205, damage: 25, armor: 1, attackCooldown: 1.0, range: 6, speed: 56, radius: MELEE_RADIUS },
      ranged: { name: 'Arcaș dac', kind: 'ranged', hp: 130, damage: 16, armor: 0, attackCooldown: 1.3, range: 150, speed: 56, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'egipteni',
    name: 'Egipteni',
    genitive: 'Egiptenilor',
    color: 0xe1b12c,
    css: '#e1b12c',
    bonus: 'Arcași de elită: rază și daune mai mari la distanță',
    description: 'Arcașii faraonului lovesc de departe, înainte ca inamicul să ajungă.',
    units: {
      melee: { name: 'Războinic cu khopesh', kind: 'melee', hp: 220, damage: 18, armor: 2, attackCooldown: 1.0, range: 6, speed: 54, radius: MELEE_RADIUS },
      ranged: { name: 'Arcaș egiptean', kind: 'ranged', hp: 125, damage: 16, armor: 0, attackCooldown: 1.25, range: 170, speed: 54, radius: RANGED_RADIUS },
    },
  },
  {
    id: 'vikingi',
    name: 'Vikingi',
    genitive: 'Vikingilor',
    color: 0x9b59b6,
    css: '#9b59b6',
    bonus: 'Berserkeri: viață mare și atac rapid',
    description: 'Luptători nordici greu de doborât, care atacă fără oprire.',
    units: {
      melee: { name: 'Berserker', kind: 'melee', hp: 260, damage: 18, armor: 1, attackCooldown: 0.88, range: 6, speed: 58, radius: MELEE_RADIUS },
      ranged: { name: 'Aruncător de sulițe', kind: 'ranged', hp: 150, damage: 17, armor: 1, attackCooldown: 1.4, range: 120, speed: 58, radius: RANGED_RADIUS },
    },
  },
];

export const CIV_BY_ID: Record<CivId, CivDef> = Object.fromEntries(CIVS.map((c) => [c.id, c])) as Record<CivId, CivDef>;

// Constante globale ale jocului. Toate distanțele sunt în unități de lume (pixeli la zoom 1).

export const WORLD_SIZE = 1200;
/** Distanța de la marginea lumii până la culoarele de pe margini (și până la castele). */
export const MAP_MARGIN = 130;
export const LANE_WIDTH = 64;

/** Pasul fix al simulării (secunde). Simularea rulează la 30 de pași pe secundă, indiferent de FPS. */
export const SIM_DT = 1 / 30;

/** Primul val apare după FIRST_WAVE_DELAY secunde, apoi câte unul la fiecare WAVE_INTERVAL. */
export const FIRST_WAVE_DELAY = 3;
export const WAVE_INTERVAL = 18;

export const CASTLE = {
  hp: 3000,
  armor: 4,
  radius: 38,
  damage: 30,
  range: 190,
  attackCooldown: 1.2,
};

export const PROJECTILE_SPEED = 420;

/** Unitățile fac daune duble clădirilor, ca atacurile care ajung la castel să conteze. */
export const BUILDING_DAMAGE_MULT = 2;

/** Poziția jucătorului uman: 0 = sus, 1 = dreapta, 2 = jos, 3 = stânga. */
export const HUMAN_SLOT = 2;

/** Câte unități pe culoar are un val, în funcție de numărul valului (0, 1, 2, ...). */
export function waveComposition(wave: number): { melee: number; ranged: number } {
  return {
    melee: Math.min(3 + Math.floor(wave / 3), 12),
    ranged: Math.min(2 + Math.floor(wave / 5), 8),
  };
}

/**
 * Armatele devin mai puternice cu timpul (viață și daune), dar castelele nu.
 * Astfel apărarea cedează treptat și meciul nu rămâne blocat la nesfârșit.
 * În etapa 2, upgrade-urile cumpărate cu aur vor adăuga diferențe între jucători.
 */
export const POWER_PER_MINUTE = 0.06;

export function armyPower(timeSec: number): number {
  return 1 + POWER_PER_MINUTE * (timeSec / 60);
}

/**
 * Glorie: la fiecare KILLS_PER_GLORY unități ucise, armata unui imperiu primește
 * încă GLORY_BONUS viață și daune. Cine câștigă luptele devine mai puternic și începe să împingă.
 * (Temporar, până la economia din etapa 2: atunci aurul pe unități ucise va juca acest rol.)
 */
export const KILLS_PER_GLORY = 30;
export const GLORY_BONUS = 0.04;

export function gloryLevel(kills: number): number {
  return Math.floor(kills / KILLS_PER_GLORY);
}

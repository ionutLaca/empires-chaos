import { BUILDING_DAMAGE_MULT, CASTLE, FIRST_WAVE_DELAY, PROJECTILE_SPEED, WAVE_INTERVAL, WORLD_SIZE, armyPower, GLORY_BONUS, gloryLevel, waveComposition } from './config';
import { CIV_BY_ID, type CivDef, type CivId, type UnitKind, type UnitStats } from './civs';
import { CASTLE_POS, NODES, laneTargets, nearestNode, pathLength, shortestPath, type Vec } from './map';
import { Rng } from './rng';
import { SpatialGrid } from './spatial';

// Simularea jocului, fără nicio legătură cu grafica. Phaser doar desenează starea de aici,
// așa că logica poate fi testată și rulată mai repede decât timpul real.

export interface Castle {
  isCastle: true;
  owner: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  radius: number;
  alive: boolean;
  cooldown: number;
}

export interface Unit {
  isCastle: false;
  id: number;
  owner: number;
  kind: UnitKind;
  stats: UnitStats;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  radius: number;
  alive: boolean;
  cooldown: number;
  retargetIn: number;
  target: Target | null;
  /** Baza spre care merge unitatea. */
  targetBase: number;
  /** Punctele de trecere (nodurile hărții) până la baza țintă. */
  path: Vec[];
  waypoint: number;
  /** De unde a început segmentul curent de drum (pentru deplasarea laterală pe culoar). */
  segmentStart: Vec;
  /** Deplasare laterală față de mijlocul culoarului, ca unitățile să nu meargă una în alta. */
  laneOffset: number;
  /** Timpul rămas din animația de atac (pentru grafică). */
  attackFlash: number;
}

export type Target = Unit | Castle;

export interface Projectile {
  owner: number;
  x: number;
  y: number;
  target: Target;
  damage: number;
  fromCastle: boolean;
  alive: boolean;
}

export interface PlayerState {
  slot: number;
  civ: CivDef;
  isHuman: boolean;
  castle: Castle;
  kills: number;
  unitsLost: number;
  eliminatedAt: number | null;
  /** Locul final (1 = câștigător), setat la eliminare sau la final. */
  place: number | null;
}

export type SimEvent =
  | { type: 'wave'; wave: number }
  | { type: 'castleDestroyed'; slot: number; by: number }
  | { type: 'gameOver'; winner: number };

export interface SimOptions {
  /** Civilizația fiecărei poziții (0..3). */
  civs: CivId[];
  humanSlot: number;
  seed?: number;
}

const MELEE_AGGRO = 150;
const RANGED_AGGRO_EXTRA = 60;
const LEASH_FACTOR = 1.6;
const RETARGET_INTERVAL = 0.4;
const WAYPOINT_REACHED = 14;
const SPAWN_SPACING = 18;

export class Simulation {
  time = 0;
  wave = 0;
  nextWaveAt = FIRST_WAVE_DELAY;
  winner: number | null = null;
  readonly players: PlayerState[];
  units: Unit[] = [];
  projectiles: Projectile[] = [];
  /** Evenimente noi de la ultima citire; interfața le golește cu takeEvents(). */
  private events: SimEvent[] = [];
  private nextUnitId = 1;
  private readonly rng: Rng;
  private readonly grid = new SpatialGrid<Unit>(WORLD_SIZE, 80);

  constructor(opts: SimOptions) {
    if (opts.civs.length !== 4) throw new Error('Simularea are nevoie de exact 4 civilizații');
    this.rng = new Rng(opts.seed ?? Date.now());
    this.players = opts.civs.map((civId, slot) => ({
      slot,
      civ: CIV_BY_ID[civId],
      isHuman: slot === opts.humanSlot,
      castle: {
        isCastle: true,
        owner: slot,
        x: CASTLE_POS[slot].x,
        y: CASTLE_POS[slot].y,
        hp: CASTLE.hp,
        maxHp: CASTLE.hp,
        armor: CASTLE.armor,
        radius: CASTLE.radius,
        alive: true,
        cooldown: 0,
      },
      kills: 0,
      unitsLost: 0,
      eliminatedAt: null,
      place: null,
    }));
  }

  get isOver(): boolean {
    return this.winner !== null;
  }

  takeEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  aliveSlots(): number[] {
    return this.players.filter((p) => p.castle.alive).map((p) => p.slot);
  }

  unitCount(slot: number): number {
    let n = 0;
    for (const u of this.units) if (u.alive && u.owner === slot) n++;
    return n;
  }

  step(dt: number): void {
    if (this.isOver) return;
    this.time += dt;

    if (this.time >= this.nextWaveAt) {
      this.spawnWave();
      this.wave++;
      this.nextWaveAt += WAVE_INTERVAL;
      this.events.push({ type: 'wave', wave: this.wave });
    }

    this.grid.clear();
    for (const u of this.units) if (u.alive) this.grid.insert(u);

    for (const u of this.units) if (u.alive) this.updateUnit(u, dt);
    for (const p of this.players) if (p.castle.alive) this.updateCastle(p.castle, dt);
    for (const pr of this.projectiles) if (pr.alive) this.updateProjectile(pr, dt);

    this.separate();

    this.units = this.units.filter((u) => u.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  // ---------------------------------------------------------------- valuri

  private spawnWave(): void {
    const comp = waveComposition(this.wave);
    for (const player of this.players) {
      if (!player.castle.alive) continue;
      for (const laneTarget of laneTargets(player.slot)) {
        const nodes = shortestPath(player.slot, laneTarget);
        const targetBase = this.players[laneTarget].castle.alive
          ? laneTarget
          : this.closestEnemyBase(player.slot, player.slot);
        if (targetBase === null) continue;
        // Unitățile ies pe culoarul lor, chiar dacă vecinul a fost eliminat: merg prin baza lui mai departe.
        const route = targetBase === laneTarget ? nodes : [...nodes, ...shortestPath(laneTarget, targetBase).slice(1)];
        this.spawnGroup(player, route, targetBase, comp.melee, comp.ranged);
      }
    }
  }

  private spawnGroup(player: PlayerState, route: number[], targetBase: number, melee: number, ranged: number): void {
    const origin = CASTLE_POS[player.slot];
    const first = NODES[route[1]];
    const len = Math.hypot(first.x - origin.x, first.y - origin.y);
    const dir = { x: (first.x - origin.x) / len, y: (first.y - origin.y) / len };
    const start = CASTLE.radius + 16;
    const kinds: UnitKind[] = [...Array(melee).fill('melee'), ...Array(ranged).fill('ranged')];
    const power = armyPower(this.time) * (1 + GLORY_BONUS * gloryLevel(player.kills));
    kinds.forEach((kind, i) => {
      // Cei de corp la corp merg în față, arcașii în spate.
      const row = Math.floor(i / 2);
      const ahead = start + (kinds.length / 2 - row) * SPAWN_SPACING;
      const offset = (i % 2 === 0 ? -1 : 1) * this.rng.range(4, 20);
      const stats = player.civ.units[kind];
      this.units.push({
        isCastle: false,
        id: this.nextUnitId++,
        owner: player.slot,
        kind,
        stats,
        x: origin.x + dir.x * ahead - dir.y * offset,
        y: origin.y + dir.y * ahead + dir.x * offset,
        hp: stats.hp * power,
        maxHp: stats.hp * power,
        damage: stats.damage * power,
        armor: stats.armor,
        radius: stats.radius,
        alive: true,
        cooldown: this.rng.range(0, stats.attackCooldown),
        retargetIn: this.rng.range(0, RETARGET_INTERVAL),
        target: null,
        targetBase,
        path: route.slice(1).map((n) => NODES[n]),
        waypoint: 0,
        segmentStart: origin,
        laneOffset: offset,
        attackFlash: 0,
      });
    });
  }

  // ---------------------------------------------------------------- unități

  private updateUnit(u: Unit, dt: number): void {
    u.cooldown -= dt;
    u.attackFlash = Math.max(0, u.attackFlash - dt);
    u.retargetIn -= dt;

    const aggro = u.kind === 'melee' ? MELEE_AGGRO : u.stats.range + RANGED_AGGRO_EXTRA;

    if (u.target && (!u.target.alive || this.gap(u, u.target) > aggro * LEASH_FACTOR)) u.target = null;
    if (u.retargetIn <= 0) {
      u.retargetIn = RETARGET_INTERVAL;
      // Preferă unitățile din apropiere; castelele sunt atacate doar când nu e nimeni de apărat.
      u.target = this.findUnitTarget(u, aggro) ?? this.findCastleTarget(u, aggro) ?? (u.target?.alive ? u.target : null);
    }

    const t = u.target;
    if (t) {
      const gap = this.gap(u, t);
      if (gap <= u.stats.range) {
        if (u.cooldown <= 0) this.attack(u, t);
      } else {
        this.moveToward(u, t.x, t.y, dt);
      }
      return;
    }

    this.followPath(u, dt);
  }

  private followPath(u: Unit, dt: number): void {
    if (!this.players[u.targetBase].castle.alive) this.reroute(u);
    const wp = u.path[u.waypoint];
    if (!wp) return;
    const sx = wp.x - u.segmentStart.x;
    const sy = wp.y - u.segmentStart.y;
    const sl = Math.hypot(sx, sy) || 1;
    // Ținta e punctul de trecere, deplasat lateral cu laneOffset (perpendicular pe direcția culoarului).
    const isLast = u.waypoint === u.path.length - 1;
    const tx = wp.x + (isLast ? 0 : (-sy / sl) * u.laneOffset);
    const ty = wp.y + (isLast ? 0 : (sx / sl) * u.laneOffset);
    if (!isLast && Math.hypot(tx - u.x, ty - u.y) < WAYPOINT_REACHED) {
      u.segmentStart = wp;
      u.waypoint++;
      return;
    }
    this.moveToward(u, tx, ty, dt);
  }

  private reroute(u: Unit): void {
    const from = nearestNode(u);
    const target = this.closestEnemyBase(u.owner, from);
    if (target === null) {
      u.path = [];
      return;
    }
    const nodes = shortestPath(from, target);
    u.targetBase = target;
    u.segmentStart = { x: u.x, y: u.y };
    u.path = nodes.map((n) => NODES[n]);
    u.waypoint = 0;
  }

  /** Cea mai apropiată bază inamică încă în viață, măsurată pe culoare de la nodul dat. */
  private closestEnemyBase(owner: number, fromNode: number): number | null {
    let best: number | null = null;
    let bestLen = Infinity;
    for (const p of this.players) {
      if (p.slot === owner || !p.castle.alive) continue;
      const len = pathLength(shortestPath(fromNode, p.slot));
      if (len < bestLen) {
        bestLen = len;
        best = p.slot;
      }
    }
    return best;
  }

  private findUnitTarget(u: Unit, aggro: number): Unit | null {
    let best: Unit | null = null;
    let bestGap = aggro;
    this.grid.query(u.x, u.y, aggro + 10, (o) => {
      if (o.owner === u.owner || !o.alive) return;
      const g = this.gap(u, o);
      if (g < bestGap) {
        bestGap = g;
        best = o;
      }
    });
    return best;
  }

  private findCastleTarget(u: Unit, aggro: number): Castle | null {
    for (const p of this.players) {
      const c = p.castle;
      if (c.owner !== u.owner && c.alive && this.gap(u, c) <= aggro) return c;
    }
    return null;
  }

  private moveToward(u: Unit, tx: number, ty: number, dt: number): void {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const stepLen = Math.min(d, u.stats.speed * dt);
    u.x += (dx / d) * stepLen;
    u.y += (dy / d) * stepLen;
  }

  private attack(u: Unit, t: Target): void {
    u.cooldown = u.stats.attackCooldown;
    u.attackFlash = 0.12;
    if (u.kind === 'melee') {
      this.dealDamage(t, u.damage, u.owner);
    } else {
      this.projectiles.push({ owner: u.owner, x: u.x, y: u.y, target: t, damage: u.damage, fromCastle: false, alive: true });
    }
  }

  // ---------------------------------------------------------------- castele și proiectile

  private updateCastle(c: Castle, dt: number): void {
    c.cooldown -= dt;
    if (c.cooldown > 0) return;
    let best: Unit | null = null;
    let bestGap = CASTLE.range;
    this.grid.query(c.x, c.y, CASTLE.range + c.radius + 10, (o) => {
      if (o.owner === c.owner || !o.alive) return;
      const g = this.gap(c, o);
      if (g < bestGap) {
        bestGap = g;
        best = o;
      }
    });
    if (best) {
      c.cooldown = CASTLE.attackCooldown;
      this.projectiles.push({ owner: c.owner, x: c.x, y: c.y, target: best, damage: CASTLE.damage, fromCastle: true, alive: true });
    }
  }

  private updateProjectile(p: Projectile, dt: number): void {
    if (!p.target.alive) {
      p.alive = false;
      return;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const d = Math.hypot(dx, dy);
    const stepLen = PROJECTILE_SPEED * dt;
    if (d <= stepLen + p.target.radius * 0.5) {
      p.alive = false;
      this.dealDamage(p.target, p.damage, p.owner);
      return;
    }
    p.x += (dx / d) * stepLen;
    p.y += (dy / d) * stepLen;
  }

  /** Reducerea daunelor prin armură, ca în Warcraft 3: fiecare punct de armură ≈ 6% mai puține daune. */
  static armorMultiplier(armor: number): number {
    return 1 - (armor * 0.06) / (1 + armor * 0.06);
  }

  private dealDamage(t: Target, amount: number, by: number): void {
    if (!t.alive) return;
    t.hp -= amount * Simulation.armorMultiplier(t.armor) * (t.isCastle ? BUILDING_DAMAGE_MULT : 1);
    if (t.hp > 0) return;
    t.hp = 0;
    t.alive = false;
    if (t.isCastle) {
      this.destroyCastle(t.owner, by);
    } else {
      this.players[by].kills++;
      this.players[t.owner].unitsLost++;
    }
  }

  private destroyCastle(slot: number, by: number): void {
    const player = this.players[slot];
    const remaining = this.aliveSlots().length;
    player.eliminatedAt = this.time;
    player.place = remaining + 1;
    // Fără castel, armata jucătorului eliminat se risipește.
    for (const u of this.units) if (u.owner === slot) u.alive = false;
    this.events.push({ type: 'castleDestroyed', slot, by });

    if (remaining <= 1) {
      const winner = this.aliveSlots()[0] ?? by;
      this.winner = winner;
      this.players[winner].place = 1;
      this.events.push({ type: 'gameOver', winner });
    }
  }

  // ---------------------------------------------------------------- coliziuni

  /** Împinge unitățile suprapuse una de alta și le ține în afara castelelor. */
  private separate(): void {
    this.grid.clear();
    for (const u of this.units) if (u.alive) this.grid.insert(u);
    for (const u of this.units) {
      if (!u.alive) continue;
      this.grid.query(u.x, u.y, 16, (o) => {
        if (o === u || !o.alive || o.id < u.id) return;
        let dx = o.x - u.x;
        let dy = o.y - u.y;
        let d = Math.hypot(dx, dy);
        const min = u.radius + o.radius;
        if (d >= min) return;
        if (d < 0.01) {
          dx = Math.cos(u.id);
          dy = Math.sin(u.id);
          d = 1;
        }
        const push = (min - d) * 0.5;
        u.x -= (dx / d) * push;
        u.y -= (dy / d) * push;
        o.x += (dx / d) * push;
        o.y += (dy / d) * push;
      });
      for (const p of this.players) {
        const c = p.castle;
        if (!c.alive) continue;
        const dx = u.x - c.x;
        const dy = u.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const min = c.radius + u.radius;
        if (d < min) {
          u.x = c.x + (dx / d) * min;
          u.y = c.y + (dy / d) * min;
        }
      }
      u.x = Math.max(u.radius, Math.min(WORLD_SIZE - u.radius, u.x));
      u.y = Math.max(u.radius, Math.min(WORLD_SIZE - u.radius, u.y));
    }
  }

  /** Distanța dintre marginile a două entități. */
  private gap(a: { x: number; y: number; radius: number }, b: { x: number; y: number; radius: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
  }
}

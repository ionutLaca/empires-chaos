import Phaser from 'phaser';
import { CASTLE, LANE_WIDTH, WORLD_SIZE } from '../game/config';
import { CENTER, LANE_EDGES, NODES } from '../game/map';
import { Rng } from '../game/rng';
import type { MatchController } from '../match';

const COLORS = {
  grass: 0x4f7a3a,
  grassDark: 0x416a30,
  lane: 0xb89b6a,
  laneEdge: 0x9c7f52,
  tree: 0x2f5424,
  treeLight: 0x3c6b2e,
  rock: 0x8a8a80,
  outline: 0x1b1b1b,
  hpBg: 0x222222,
  hpGood: 0x4cd137,
  hpMid: 0xfbc531,
  hpLow: 0xe84118,
  arrow: 0xf5f0e1,
  stone: 0x55524b,
  rubble: 0x5e5a52,
};

/** Desenează harta și starea simulării. Nu conține logică de joc. */
export class GameScene extends Phaser.Scene {
  private dyn!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly match: MatchController) {
    super('game');
  }

  create(): void {
    this.drawBackground();
    this.dyn = this.add.graphics();

    for (const p of this.match.sim.players) {
      const c = p.castle;
      const label = this.add
        .text(c.x, c.y - CASTLE.radius - 30, p.isHuman ? `${p.civ.name} (You)` : p.civ.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 5,
        })
        .setOrigin(0.5, 1);
      this.labels.push(label);
    }
  }

  update(): void {
    this.match.advance();
    this.drawDynamic();
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.grass).fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Pete de iarbă mai închisă și copaci decorativi, mereu la fel (seed fix).
    const rng = new Rng(7);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(COLORS.grassDark, 0.6).fillCircle(rng.range(0, WORLD_SIZE), rng.range(0, WORLD_SIZE), rng.range(20, 60));
    }

    // Culoarele: o margine mai închisă, apoi drumul propriu-zis.
    for (const [width, color] of [
      [LANE_WIDTH + 10, COLORS.laneEdge],
      [LANE_WIDTH, COLORS.lane],
    ] as const) {
      g.lineStyle(width, color);
      for (const [a, b] of LANE_EDGES) g.lineBetween(NODES[a].x, NODES[a].y, NODES[b].x, NODES[b].y);
      g.fillStyle(color);
      for (const n of NODES) g.fillCircle(n.x, n.y, width / 2);
    }
    g.fillStyle(COLORS.laneEdge).fillCircle(CENTER.x, CENTER.y, 95);
    g.fillStyle(COLORS.lane).fillCircle(CENTER.x, CENTER.y, 88);

    for (let i = 0; i < 260; i++) {
      const x = rng.range(10, WORLD_SIZE - 10);
      const y = rng.range(10, WORLD_SIZE - 10);
      if (this.nearLane(x, y, LANE_WIDTH / 2 + 22)) continue;
      if (rng.next() < 0.15) {
        g.fillStyle(COLORS.rock).fillEllipse(x, y, rng.range(10, 18), rng.range(7, 12));
      } else {
        const r = rng.range(8, 15);
        g.fillStyle(COLORS.tree).fillCircle(x, y, r);
        g.fillStyle(COLORS.treeLight).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55);
      }
    }
  }

  private nearLane(x: number, y: number, margin: number): boolean {
    if (Math.hypot(x - CENTER.x, y - CENTER.y) < 95 + margin) return true;
    for (const [a, b] of LANE_EDGES) {
      const A = NODES[a];
      const B = NODES[b];
      const abx = B.x - A.x;
      const aby = B.y - A.y;
      const t = Math.max(0, Math.min(1, ((x - A.x) * abx + (y - A.y) * aby) / (abx * abx + aby * aby)));
      if (Math.hypot(x - (A.x + abx * t), y - (A.y + aby * t)) < margin) return true;
    }
    for (const n of NODES) if (Math.hypot(x - n.x, y - n.y) < CASTLE.radius + margin + 20) return true;
    return false;
  }

  private drawDynamic(): void {
    const g = this.dyn;
    const sim = this.match.sim;
    g.clear();

    // Castelele
    for (const p of sim.players) {
      const c = p.castle;
      const r = c.radius;
      if (!c.alive) {
        g.fillStyle(COLORS.rubble).fillRect(c.x - r, c.y - r, r * 2, r * 2);
        g.lineStyle(3, COLORS.outline).strokeRect(c.x - r, c.y - r, r * 2, r * 2);
        g.lineStyle(4, 0x2d2a26).lineBetween(c.x - r, c.y - r, c.x + r, c.y + r).lineBetween(c.x + r, c.y - r, c.x - r, c.y + r);
        continue;
      }
      if (p.isHuman) g.lineStyle(2, 0xffffff, 0.35).strokeCircle(c.x, c.y, CASTLE.range + c.radius);
      g.fillStyle(p.civ.color).fillRect(c.x - r, c.y - r, r * 2, r * 2);
      // Turnuri în colțuri
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.fillStyle(p.civ.color).fillRect(c.x + sx * r - 10, c.y + sy * r - 10, 20, 20);
        g.lineStyle(3, COLORS.outline).strokeRect(c.x + sx * r - 10, c.y + sy * r - 10, 20, 20);
      }
      g.lineStyle(3, COLORS.outline).strokeRect(c.x - r, c.y - r, r * 2, r * 2);
      g.fillStyle(0xffffff, 0.25).fillRect(c.x - r * 0.45, c.y - r * 0.45, r * 0.9, r * 0.9);
      this.hpBar(g, c.x, c.y + r + 14, 90, 9, c.hp / c.maxHp);
    }

    // Unitățile: cerc = corp la corp, romb = atac de la distanță
    for (const u of sim.units) {
      const color = sim.players[u.owner].civ.color;
      const fill = u.attackFlash > 0 ? 0xffffff : color;
      g.fillStyle(fill);
      g.lineStyle(2, COLORS.outline);
      if (u.kind === 'melee') {
        g.fillCircle(u.x, u.y, u.radius);
        g.strokeCircle(u.x, u.y, u.radius);
      } else {
        const r = u.radius + 1.5;
        const pts = [
          new Phaser.Math.Vector2(u.x, u.y - r),
          new Phaser.Math.Vector2(u.x + r, u.y),
          new Phaser.Math.Vector2(u.x, u.y + r),
          new Phaser.Math.Vector2(u.x - r, u.y),
        ];
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
      }
      if (u.hp < u.maxHp) this.hpBar(g, u.x, u.y - u.radius - 5, 16, 3, u.hp / u.maxHp);
    }

    // Proiectilele
    for (const p of sim.projectiles) {
      if (p.fromCastle) {
        g.fillStyle(COLORS.stone).fillCircle(p.x, p.y, 4);
      } else {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        g.lineStyle(2, COLORS.arrow).lineBetween(p.x, p.y, p.x - (dx / d) * 9, p.y - (dy / d) * 9);
      }
    }
  }

  private hpBar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, frac: number): void {
    const f = Math.max(0, Math.min(1, frac));
    g.fillStyle(COLORS.hpBg).fillRect(cx - w / 2, cy - h / 2, w, h);
    g.fillStyle(f > 0.6 ? COLORS.hpGood : f > 0.3 ? COLORS.hpMid : COLORS.hpLow).fillRect(cx - w / 2, cy - h / 2, w * f, h);
  }
}

import { SIM_DT } from './game/config';
import { Simulation } from './game/sim';

/** Leagă timpul real de simulare: pauză, viteză (1x/2x/4x) și pași ficși. */
export class MatchController {
  paused = false;
  speed = 1;
  private acc = 0;
  private lastNow: number | null = null;

  constructor(readonly sim: Simulation) {}

  /**
   * Avansează simularea cu timpul real scurs de la apelul anterior.
   * Măsurăm noi timpul (nu folosim delta de la Phaser), pentru că Phaser îl „netezește”
   * și, la FPS mic, jocul ar merge mai încet decât ceasul real.
   */
  advance(now = performance.now()): void {
    const deltaMs = this.lastNow === null ? 0 : now - this.lastNow;
    this.lastNow = now;
    if (this.paused || this.sim.isOver) return;
    // Limităm delta ca un tab trecut în fundal să nu producă un salt uriaș.
    this.acc += (Math.min(deltaMs, 250) / 1000) * this.speed;
    let steps = 0;
    while (this.acc >= SIM_DT && steps < 40) {
      this.sim.step(SIM_DT);
      this.acc -= SIM_DT;
      steps++;
    }
  }
}

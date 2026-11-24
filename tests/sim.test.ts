import { describe, expect, it } from 'vitest';
import { CIVS, type CivId } from '../src/game/civs';
import { SIM_DT } from '../src/game/config';
import { CENTER_NODE, laneTargets, shortestPath } from '../src/game/map';
import { Simulation } from '../src/game/sim';

function runToEnd(civs: CivId[], seed: number, maxMinutes = 40): Simulation {
  const sim = new Simulation({ civs, humanSlot: 3, seed });
  const maxSteps = (maxMinutes * 60) / SIM_DT;
  for (let i = 0; i < maxSteps && !sim.isOver; i++) sim.step(SIM_DT);
  return sim;
}

describe('harta', () => {
  it('fiecare bază are 3 culoare: doi vecini și baza opusă', () => {
    expect(laneTargets(0)).toEqual([1, 3, 2]);
    expect(laneTargets(3)).toEqual([0, 2, 1]);
  });

  it('vecinii sunt legați direct pe margine, baza opusă prin centru', () => {
    expect(shortestPath(0, 1)).toEqual([0, 1]);
    expect(shortestPath(3, 0)).toEqual([3, 0]);
    expect(shortestPath(0, 2)).toEqual([0, CENTER_NODE, 2]);
    expect(shortestPath(1, 3)).toEqual([1, CENTER_NODE, 3]);
  });
});

describe('simularea', () => {
  it('armura reduce daunele ca în Warcraft 3', () => {
    expect(Simulation.armorMultiplier(0)).toBe(1);
    expect(Simulation.armorMultiplier(5)).toBeCloseTo(0.769, 2);
  });

  it('primul val trimite unități pe toate cele 3 culoare ale fiecărei baze', () => {
    const sim = new Simulation({ civs: ['romani', 'daci', 'egipteni', 'vikingi'], humanSlot: 3, seed: 1 });
    for (let i = 0; i < 4 / SIM_DT; i++) sim.step(SIM_DT);
    expect(sim.wave).toBe(1);
    for (let slot = 0; slot < 4; slot++) {
      const targets = new Set(sim.units.filter((u) => u.owner === slot).map((u) => u.targetBase));
      expect([...targets].sort()).toEqual(laneTargets(slot).sort());
      expect(sim.unitCount(slot)).toBe(3 * 5);
    }
  });

  it('un meci se termină cu un câștigător și cu locurile 1-4 împărțite corect', () => {
    const sim = runToEnd(['romani', 'daci', 'egipteni', 'vikingi'], 42);
    expect(sim.isOver).toBe(true);
    const places = sim.players.map((p) => p.place).sort();
    expect(places).toEqual([1, 2, 3, 4]);
    expect(sim.players[sim.winner!].place).toBe(1);
  }, 120_000);

  it('meciurile se termină pentru orice așezare a civilizațiilor', () => {
    const ids = CIVS.map((c) => c.id);
    for (let seed = 1; seed <= 4; seed++) {
      const civs = [...ids.slice(seed % 4), ...ids.slice(0, seed % 4)];
      const sim = runToEnd(civs, seed);
      expect(sim.isOver, `seed ${seed}`).toBe(true);
    }
  }, 300_000);
});

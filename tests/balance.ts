// Rulează multe meciuri fără grafică și arată cât de des câștigă fiecare civilizație.
// Folosire: npx vite-node tests/balance.ts   (sau: npx tsx tests/balance.ts)
import { PLAYABLE_CIVS, type CivId } from '../src/game/civs';
import { SIM_DT } from '../src/game/config';
import { Rng } from '../src/game/rng';
import { Simulation } from '../src/game/sim';

const GAMES = Number(process.argv[2] ?? 40);
const wins: Record<string, number> = {};
const durations: number[] = [];
let unfinished = 0;

for (let g = 0; g < GAMES; g++) {
  const civs = new Rng(1000 + g).shuffle(PLAYABLE_CIVS.map((c) => c.id)) as CivId[];
  const sim = new Simulation({ civs, humanSlot: 3, seed: 1000 + g });
  for (let i = 0; i < (40 * 60) / SIM_DT && !sim.isOver; i++) sim.step(SIM_DT);
  if (!sim.isOver) {
    unfinished++;
    continue;
  }
  const w = sim.players[sim.winner!].civ.name;
  wins[w] = (wins[w] ?? 0) + 1;
  durations.push(sim.time);
}

durations.sort((a, b) => a - b);
const min = (s: number) => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`;
console.log(`Meciuri: ${GAMES}, neterminate în 40 min: ${unfinished}`);
console.log('Victorii:', wins);
if (durations.length) console.log(`Durată: min ${min(durations[0])}, mediană ${min(durations[Math.floor(durations.length / 2)])}, max ${min(durations[durations.length - 1])}`);

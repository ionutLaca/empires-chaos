import { MAP_MARGIN, WORLD_SIZE } from './config';

export interface Vec {
  x: number;
  y: number;
}

const M = MAP_MARGIN;
const F = WORLD_SIZE - MAP_MARGIN;
const MID = WORLD_SIZE / 2;

/**
 * Pozițiile castelelor, în cruce, la mijlocul fiecărei laturi,
 * în sensul acelor de ceasornic: sus, dreapta, jos, stânga.
 */
export const CASTLE_POS: Vec[] = [
  { x: MID, y: M },
  { x: F, y: MID },
  { x: MID, y: F },
  { x: M, y: MID },
];

/** Colțurile hărții. Colțul k se află între baza k și baza k+1 (dreapta-sus, dreapta-jos, stânga-jos, stânga-sus). */
export const CORNER_POS: Vec[] = [
  { x: F, y: M },
  { x: F, y: F },
  { x: M, y: F },
  { x: M, y: M },
];

export const CENTER: Vec = { x: MID, y: MID };

const CORNER_NODE = (k: number) => 4 + k;
export const CENTER_NODE = 8;

/** Nodurile grafului de culoare: 4 castele (0-3), 4 colțuri (4-7), centrul (8). */
export const NODES: Vec[] = [...CASTLE_POS, ...CORNER_POS, CENTER];

/**
 * Culoarele, ca pe harta originală: un pătrat pe marginile hărții (de la fiecare castel spre cele
 * două colțuri vecine) și o cruce prin mijloc (de la fiecare castel spre centru).
 */
export const LANE_EDGES: [number, number][] = [
  ...[0, 1, 2, 3].flatMap((k): [number, number][] => [
    [k, CORNER_NODE(k)],
    [CORNER_NODE(k), (k + 1) % 4],
  ]),
  ...[0, 1, 2, 3].map((k): [number, number] => [k, CENTER_NODE]),
];

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Baza vizată de fiecare culoar al unei baze: vecinul din dreapta, vecinul din stânga, opusul (prin centru). */
export function laneTargets(slot: number): number[] {
  return [(slot + 1) % 4, (slot + 3) % 4, (slot + 2) % 4];
}

/**
 * Drumul fix al unui culoar, ca listă de noduri: spre vecini pe margine (prin colțul dintre ei),
 * spre baza opusă prin centru.
 */
export function laneRoute(slot: number, target: number): number[] {
  if (target === (slot + 1) % 4) return [slot, CORNER_NODE(slot), target];
  if (target === (slot + 3) % 4) return [slot, CORNER_NODE(target), target];
  if (target === (slot + 2) % 4) return [slot, CENTER_NODE, target];
  throw new Error(`No lane from base ${slot} to base ${target}`);
}

/** Cel mai scurt drum (Dijkstra) între două noduri, ca listă de indici de noduri, inclusiv capetele. */
export function shortestPath(from: number, to: number): number[] {
  const n = NODES.length;
  const best = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  best[from] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || best[i] < best[u])) u = i;
    if (u === -1 || best[u] === Infinity) break;
    done[u] = true;
    for (const [a, b] of LANE_EDGES) {
      const v = a === u ? b : b === u ? a : -1;
      if (v === -1) continue;
      const d = best[u] + dist(NODES[u], NODES[v]);
      if (d < best[v]) {
        best[v] = d;
        prev[v] = u;
      }
    }
  }
  const path: number[] = [];
  for (let at = to; at !== -1; at = prev[at]) path.unshift(at);
  return path[0] === from ? path : [];
}

export function nearestNode(p: Vec): number {
  let bestI = 0;
  let bestD = Infinity;
  NODES.forEach((node, i) => {
    const d = dist(p, node);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  });
  return bestI;
}

export function pathLength(nodes: number[]): number {
  let total = 0;
  for (let i = 1; i < nodes.length; i++) total += dist(NODES[nodes[i - 1]], NODES[nodes[i]]);
  return total;
}

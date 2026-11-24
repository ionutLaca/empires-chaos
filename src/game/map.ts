import { CORNER_MARGIN, WORLD_SIZE } from './config';

export interface Vec {
  x: number;
  y: number;
}

const M = CORNER_MARGIN;
const F = WORLD_SIZE - CORNER_MARGIN;

/** Pozițiile castelelor, în sensul acelor de ceasornic: stânga-sus, dreapta-sus, dreapta-jos, stânga-jos. */
export const CASTLE_POS: Vec[] = [
  { x: M, y: M },
  { x: F, y: M },
  { x: F, y: F },
  { x: M, y: F },
];

export const CENTER: Vec = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
export const CENTER_NODE = 4;

/** Nodurile grafului de culoare: cele 4 castele + centrul hărții. */
export const NODES: Vec[] = [...CASTLE_POS, CENTER];

/**
 * Culoarele: 4 pe margini (între castele vecine) și 4 spre centru (cele două diagonale).
 * Ca pe harta originală, fiecare bază trimite unități pe 3 culoare: două pe margini, unul prin mijloc.
 */
export const LANE_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [0, CENTER_NODE],
  [1, CENTER_NODE],
  [2, CENTER_NODE],
  [3, CENTER_NODE],
];

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Baza vizată de fiecare culoar al unei baze: vecinul din dreapta, vecinul din stânga, opusul (prin centru). */
export function laneTargets(slot: number): number[] {
  return [(slot + 1) % 4, (slot + 3) % 4, (slot + 2) % 4];
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

import Phaser from 'phaser';
import './style.css';
import { CIVS, type CivDef, type CivId } from './game/civs';
import { GLORY_BONUS, HUMAN_SLOT, KILLS_PER_GLORY, WORLD_SIZE, armyPower, gloryLevel } from './game/config';
import { Rng } from './game/rng';
import { Simulation, type SimEvent } from './game/sim';
import { MatchController } from './match';
import { GameScene } from './render/GameScene';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let selectedCiv: CivId | null = null;
let game: Phaser.Game | null = null;
let match: MatchController | null = null;
let hudTimer: number | undefined;
let log: string[] = [];
let spectating = false;

// ------------------------------------------------------------------ meniu

function renderMenu(): void {
  const cards = $('civ-cards');
  cards.innerHTML = '';
  for (const civ of CIVS) {
    const card = document.createElement('button');
    card.className = 'civ-card';
    card.style.setProperty('--civ', civ.css);
    card.innerHTML = `
      <h3>${civ.name}</h3>
      <p class="bonus">${civ.bonus}</p>
      <p>${civ.description}</p>
      <ul>
        <li>Melee: ${civ.units.melee.name}</li>
        <li>Ranged: ${civ.units.ranged.name}</li>
      </ul>`;
    card.addEventListener('click', () => {
      selectedCiv = civ.id;
      cards.querySelectorAll('.civ-card').forEach((c) => c.classList.toggle('selected', c === card));
      $<HTMLButtonElement>('btn-start').disabled = false;
    });
    cards.appendChild(card);
  }
}

function showMenu(): void {
  stopMatch();
  $('overlay').classList.add('hidden');
  $('play').classList.add('hidden');
  $('menu').classList.remove('hidden');
}

// ------------------------------------------------------------------ meci

function startMatch(civId: CivId): void {
  stopMatch();
  const seed = Date.now() >>> 0;
  const others = new Rng(seed).shuffle(CIVS.filter((c) => c.id !== civId).map((c) => c.id));
  const civs: CivId[] = [];
  for (let slot = 0; slot < 4; slot++) civs.push(slot === HUMAN_SLOT ? civId : others.shift()!);

  match = new MatchController(new Simulation({ civs, humanSlot: HUMAN_SLOT, seed }));
  log = [];
  spectating = false;

  $('menu').classList.add('hidden');
  $('overlay').classList.add('hidden');
  $('play').classList.remove('hidden');

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: WORLD_SIZE,
    height: WORLD_SIZE,
    backgroundColor: '#10130f',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new GameScene(match),
  });

  setSpeed(1);
  hudTimer = window.setInterval(updateHud, 200);
  updateHud();
}

function stopMatch(): void {
  if (hudTimer !== undefined) window.clearInterval(hudTimer);
  hudTimer = undefined;
  game?.destroy(true);
  game = null;
  match = null;
}

function setSpeed(speed: number): void {
  if (!match) return;
  if (speed === 0) {
    match.paused = !match.paused;
  } else {
    match.paused = false;
    match.speed = speed;
  }
  document.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) => {
    const s = Number(b.dataset.speed);
    b.classList.toggle('active', s === 0 ? match!.paused : !match!.paused && s === match!.speed);
  });
}

// ------------------------------------------------------------------ HUD

function ordinal(n: number): string {
  return `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`;
}

function fmtTime(sec: number): string {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateHud(): void {
  if (!match) return;
  const sim = match.sim;
  handleEvents(sim.takeEvents());

  $('hud-time').textContent = fmtTime(sim.time);
  $('hud-wave').textContent = String(sim.wave);
  $('hud-next').textContent = sim.isOver ? '-' : `${Math.ceil(sim.nextWaveAt - sim.time)}s`;
  $('hud-power').textContent = `+${Math.round((armyPower(sim.time) - 1) * 100)}%`;

  $('hud-players').innerHTML = sim.players
    .map((p) => {
      const c = p.castle;
      const hp = Math.round((c.hp / c.maxHp) * 100);
      const status = c.alive ? `${Math.ceil(c.hp)} / ${c.maxHp}` : `Eliminated · ${ordinal(p.place!)} place`;
      return `
        <div class="player ${c.alive ? '' : 'dead'} ${p.isHuman ? 'me' : ''}" style="--civ:${p.civ.css}">
          <div class="top"><span>${p.civ.name}${p.isHuman ? ' (You)' : ''}</span><span>${c.alive ? hp + '%' : '✖'}</span></div>
          <div class="hpbar"><i style="width:${hp}%"></i></div>
          <div class="meta">Castle: ${status}<br>Units: ${sim.unitCount(p.slot)} · Kills: ${p.kills} · Glory: ${gloryLevel(p.kills)}</div>
        </div>`;
    })
    .join('');

  $('hud-log').innerHTML = log.map((l) => `<li>${l}</li>`).join('');
}

function civOf(slot: number): CivDef {
  return match!.sim.players[slot].civ;
}

function handleEvents(events: SimEvent[]): void {
  if (!match || events.length === 0) return;
  const sim = match.sim;
  for (const e of events) {
    if (e.type === 'castleDestroyed') {
      pushLog(`${fmtTime(sim.time)} – The ${civOf(e.by).name} destroyed the ${civOf(e.slot).name}' castle.`);
      if (sim.players[e.slot].isHuman && !sim.isOver) {
        showOverlay(
          'Defeat!',
          `Your castle was destroyed by the ${civOf(e.by).name}. You finished ${ordinal(sim.players[e.slot].place!)} of 4.`,
          true,
        );
      }
    } else if (e.type === 'gameOver') {
      const winner = sim.players[e.winner];
      pushLog(`${fmtTime(sim.time)} – The ${winner.civ.name} win the game!`);
      const human = sim.players.find((p) => p.isHuman)!;
      if (winner.isHuman) {
        showOverlay('Victory!', `The ${winner.civ.name} destroyed every enemy castle in ${fmtTime(sim.time)}.`, false);
      } else {
        showOverlay('Game over', `The ${winner.civ.name} win. You finished ${ordinal(human.place!)} of 4.`, false);
      }
    }
  }
}

function pushLog(line: string): void {
  log = [line, ...log].slice(0, 6);
}

function showOverlay(title: string, text: string, canSpectate: boolean): void {
  if (spectating && canSpectate) return;
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  $('btn-spectate').classList.toggle('hidden', !canSpectate);
  $('overlay').classList.remove('hidden');
}

// ------------------------------------------------------------------ inițializare

// Doar în modul de dezvoltare (npm run dev): acces la meciul curent din consola browserului.
if (import.meta.env.DEV) Object.assign(window, { ec: () => match });

renderMenu();
$('hud-glory-rule').textContent = `Glory: every ${KILLS_PER_GLORY} kills give your army +${Math.round(GLORY_BONUS * 100)}% health and damage.`;

$('btn-start').addEventListener('click', () => selectedCiv && startMatch(selectedCiv));
$('btn-menu').addEventListener('click', showMenu);
$('btn-again').addEventListener('click', showMenu);
$('btn-spectate').addEventListener('click', () => {
  spectating = true;
  $('overlay').classList.add('hidden');
});
document.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) =>
  b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))),
);

document.addEventListener('keydown', (e) => {
  if (!match || $('play').classList.contains('hidden')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    setSpeed(0);
  } else if (e.key === '1') setSpeed(1);
  else if (e.key === '2') setSpeed(2);
  else if (e.key === '3') setSpeed(4);
});

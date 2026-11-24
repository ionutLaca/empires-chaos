# Empires Chaos

Joc de strategie în browser, inspirat de harta custom *Survival Chaos* din Warcraft 3.
Patru imperii istorice, câte unul în fiecare colț al hărții, își trimit automat armatele pe culoare.
Ultimul castel rămas în picioare câștigă.

## Cum rulezi jocul

Ai nevoie de [Node.js](https://nodejs.org/) 20 sau mai nou.

```bash
npm install
npm run dev
```

Apoi deschide adresa afișată în terminal (de obicei http://localhost:5173).

Alte comenzi:

| Comandă | Ce face |
|---|---|
| `npm run build` | Verifică tipurile și creează versiunea finală în `dist/` |
| `npm test` | Rulează testele simulării |
| `npx tsx tests/balance.ts 40` | Simulează 40 de meciuri și arată câte victorii are fiecare civilizație |

## Joacă online

După ce activezi GitHub Pages (Settings → Pages → Source: **GitHub Actions**), jocul se publică automat
la fiecare push pe `main`, la adresa https://ionutlaca.github.io/empires-chaos/

## Cum se joacă (etapa 1)

- Alegi o civilizație; celelalte trei sunt controlate de calculator.
- La fiecare 18 secunde, fiecare castel trimite un val de unități pe cele 3 culoare ale sale:
  două pe marginile hărții (spre vecini) și unul prin mijloc (spre baza opusă).
- Unitățile atacă tot ce întâlnesc; castelele se apără singure.
- Valurile devin mai mari, iar armatele mai puternice cu timpul (+10% pe minut), așa că până la urmă apărarea cedează.
- **Glorie:** la fiecare 30 de unități ucise, armata ta primește +4% viață și daune. Cine câștigă luptele începe să împingă.
  (Temporar, până la economia din etapa 2.)
- Când un castel cade, armata lui dispare, iar unitățile care mergeau spre el pornesc spre următorul inamic.

Controale: **Space** = pauză, **1 / 2 / 3** = viteză 1x / 2x / 4x.

## Civilizații

| Civilizație | Corp la corp | Distanță | Specific |
|---|---|---|---|
| Romani | Legionar | Sagittarius | Armură foarte mare |
| Daci | Războinic cu falx | Arcaș dac | Daune mari corp la corp |
| Egipteni | Războinic cu khopesh | Arcaș egiptean | Arcași cu rază și daune mai mari |
| Vikingi | Berserker | Aruncător de sulițe | Viață mare, atac rapid |

## Structura codului

```
src/
  game/        logica jocului, fără grafică (se poate testa și rula mai repede decât timpul real)
    config.ts  constante: dimensiunea hărții, valuri, castel
    civs.ts    civilizațiile și statisticile unităților
    map.ts     pozițiile castelelor și graful de culoare
    sim.ts     simularea: valuri, deplasare, luptă, eliminare
  render/
    GameScene.ts  desenarea cu Phaser
  match.ts     pauză, viteză și pașii ficși ai simulării
  main.ts      meniul și panoul lateral (HTML)
tests/         teste (Vitest) și scriptul de echilibrare
```

## Plan

1. **Nucleul jocului:** hartă, culoare, valuri automate, luptă, eliminare *(gata)*
2. **Economia:** aur, magazin, tier-uri de unități, upgrade-uri de atac și armură
3. **AI-ul care cumpără upgrade-uri** și diferențe mai mari între civilizații
4. **Eroii și turnurile**
5. **Finisare:** grafică, sunete, echilibrare

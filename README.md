# Space Defender

A browser-based top-down space shooter built with [Phaser](https://phaser.io/) 4 + TypeScript + Vite. No external art/audio assets — every sprite is generated procedurally at boot time.

## Controls

- **Move:** WASD or Arrow Keys
- **Aim:** Mouse pointer
- **Fire:** Left click or Space (hold for continuous fire)
- **Use power-up:** F

## Gameplay

- Flow: **Menu → Character Select → Level Select → Game → Game Over**. Backspace steps back a screen; arrow keys/A-D move the selection, Enter or a click confirms.
- **Characters** trade off speed, fire rate, lives, and ammo: Interceptor (balanced), Vanguard (tankier, slower), Striker (fast and fragile). Stats are shown as bars on the select screen.
- **Levels** (Sector Alpha/Beta/Gamma) scale enemy spawn rate and the mix of shooter/elite enemies.
- Destroy enemies for score. Basic enemies just drop in; **shooter** enemies (orange) fire lasers back at you; **extra** enemies (purple) are tougher, worth more, and always drop a pickup on death.
- Ammo is limited — pick up green ammo packs to refill.
- Bomb, shield, and rapid-fire pickups go into one of your 4 power-up slots; press **F** to use the oldest one in the queue. Bomb clears all on-screen enemies; shield grants temporary invulnerability; rapid fire triples your fire rate for a few seconds.
- The purple "random item" pickup resolves into an instant ammo burst or one of the above slot power-ups.
- A HULL bar at the top shows remaining lives (color-coded green/amber/red), with a brief invulnerability window after each hit.
- On Game Over, retry keeps your character/level choice, or press **M** to return to the main menu and pick again.

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

## Deployment

`npm run build` outputs a fully static site to `dist/` (HTML/CSS/JS only, no server-side logic). Any static host works:

- **Static hosts / CDNs:** Netlify, Vercel, GitHub Pages, Cloudflare Pages — point them at `dist/`.
- **Your own server:** serve `dist/` with nginx, Caddy, or any static file server. Example with nginx: set `root` to the `dist` directory and serve `index.html` for `/`.
- **Quick local check:** `npm run preview` serves the built output on `localhost:4173`.

There's no backend/database — it's entirely client-side, so hosting is just "serve these static files."

## Project structure

```
src/
  config.ts                  tunable constants + character/level definitions
  main.ts                    Phaser game bootstrap
  scenes/
    BootScene.ts              procedurally generates all textures
    MenuScene.ts               title screen
    CharacterSelectScene.ts     ship select with stat comparison
    LevelSelectScene.ts          sector/difficulty select
    GameScene.ts                  core gameplay loop, spawning, collisions, HUD
    GameOverScene.ts             score + retry/menu
  objects/
    Player.ts                  movement, aiming, firing, ammo, powerups, shield
    Enemy.ts                    enemy variants (basic/shooter/extra)
    Pickup.ts                    ammo/bomb/shield/random pickups
```

## Possible next steps

- More characters/levels — both are plain data arrays in `config.ts`, so new entries just need a color and stat/weight tuning.
- Persist high scores and best-run-per-loadout (e.g. `localStorage`).
- Sound effects/music.
- Mobile/touch controls.

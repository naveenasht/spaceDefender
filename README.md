# Space Defender

A browser-based top-down space shooter built with [Phaser](https://phaser.io/) 4 + TypeScript + Vite. No external art/audio assets — every sprite is generated procedurally at boot time.

## Controls

- **Move:** WASD or Arrow Keys
- **Aim:** Mouse pointer
- **Fire:** Left click or Space (hold for continuous fire)
- **Use power-up:** F
- **Pause:** P or Escape
- **Mobile/touch:** on any touch device, the desktop controls are replaced by a dual-stick layout — the left stick moves, the right stick aims and fires continuously while held. Tap the diamond button to use a power-up, and the pause icon (top-right) to pause; the pause and game-over screens are also tap-friendly.

## Gameplay

- The main menu has three buttons: **PLAY** starts a run — first time through it opens Character Select, but once you've picked a loadout at least once, it remembers it and jumps straight to Level Select; **CHARACTERS** and **LASERS** jump directly to those select screens (to browse or spend coins) without committing to a run. Space bar is a shortcut for PLAY.
- Flow from there: **Character Select → Laser Select → Level Select → Game → Game Over**. Backspace steps back a screen, or tap/click "← MENU" (top-left on all three select screens) to jump straight back to the main menu; arrow keys/A-D move the selection, Enter or a click confirms.
- **Characters** trade off speed, fire rate, lives, and ammo: Interceptor (balanced, free), Vanguard (tankier, slower, 100 coins), Striker (fast and fragile, 150 coins). Stats are shown as bars on the select screen; locked ships show a lock icon and coin cost the same way locked lasers do.
- **Lasers** — six weapons with real tradeoffs, picked from a chip strip + detail panel showing damage/power/pierce/rate/ammo bars: Pulse (balanced default, free), Spread (3-way fan, great vs crowds, free), Twin (parallel double-tap, focused single-target DPS, 100 coins), Piercing (punches through 3 targets, 150 coins), Homing (bolts auto-steer toward the nearest enemy, 200 coins), Heavy Cannon (2x damage per hit, slow fire rate, expensive ammo, 250 coins). Locked lasers show a lock icon on their chip and a coin cost in the detail panel; selecting one spends coins to unlock it permanently instead of confirming.
- **Levels** (Sector Alpha/Beta/Gamma) scale enemy spawn rate and the mix of shooter/elite enemies. Each has a survival-time goal (1:30 / 2:00 / 2:30) shown as a countdown bar under the HULL bar — reach it and the sector clears; run out of lives first and it's Game Over instead.
- Destroy enemies for score. Basic enemies just drop in; **shooter** enemies (orange) are slower and tougher and worth more score, but only damage you on contact — no ranged enemy fire at all; **extra** enemies (purple) are tougher still, worth even more, and always drop a pickup on death.
- Ammo is limited — pick up green ammo packs to refill.
- Bomb, shield, and rapid-fire pickups go into one of your 4 power-up slots; press **F** to use the oldest one in the queue. Bomb clears all on-screen enemies; shield grants temporary invulnerability; rapid fire triples your fire rate for a few seconds.
- The purple "random item" pickup resolves into an instant ammo burst or one of the above slot power-ups.
- A HULL bar at the top shows remaining lives (color-coded green/amber/red), with a brief invulnerability window after each hit.
- Either way — SECTOR CLEARED or GAME OVER — retry keeps your character/level choice, or press **M** to return to the main menu and pick again.
- Your best score is saved per sector and overall (`localStorage`) — shown on the level cards and called out with a "NEW BEST!" banner on Game Over. All sound is synthesized live (WebAudio oscillators/noise, no audio files); click the speaker icon (top-right) to mute, which also persists.
- New players start with a 100-coin welcome grant; after that, clearing a sector pays out coins (50 × its difficulty tier — 50/100/150 for Alpha/Beta/Gamma), persisted alongside your best scores and shown as a running total on the main menu and the character/laser select screens. Dying doesn't pay out — only clearing does. Spend coins on those two screens to permanently unlock pricier ships and weapons; selecting a locked one spends the coins and unlocks it in place instead of confirming, or shakes the screen with a denied cue if you can't afford it.

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
    LaserSelectScene.ts          weapon select with stat comparison
    LevelSelectScene.ts           sector/difficulty select
    GameScene.ts                  core gameplay loop, spawning, collisions, HUD
    GameOverScene.ts             score + retry/menu
  objects/
    Player.ts                  movement, aiming, firing, ammo, powerups, shield
    Enemy.ts                    enemy variants (basic/shooter/extra)
    Pickup.ts                    ammo/bomb/shield/random pickups
    VirtualJoystick.ts           on-screen thumbstick for touch controls
```

## Possible next steps

- More characters/levels — both are plain data arrays in `config.ts`, so new entries just need a color and stat/weight tuning.
- Settings menu (volume slider, key rebinding).

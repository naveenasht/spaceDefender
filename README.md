# Space Defender

A browser-based top-down space shooter built with [Phaser](https://phaser.io/) 4 + TypeScript + Vite. No external art/audio assets — every sprite is generated procedurally at boot time.

## Controls

- **Move:** WASD or Arrow Keys
- **Aim:** Mouse pointer
- **Fire:** Left click or Space (hold for continuous fire)
- **Use power-up:** F

## Gameplay

- Destroy enemies for score. Basic enemies just drop in; **shooter** enemies (orange) fire lasers back at you; **extra** enemies (purple) are tougher, worth more, and always drop a pickup on death.
- Ammo is limited — pick up green ammo packs to refill.
- Bomb and shield pickups go into one of your 4 power-up slots; press **F** to use the oldest one in the queue. Bomb clears all on-screen enemies; shield grants temporary invulnerability.
- The purple "random item" pickup resolves immediately into a bonus: an ammo burst, temporary rapid fire, a shield charge, or a bomb charge.
- You have 3 lives, with a brief invulnerability window after each hit.

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
  config.ts           tunable game constants
  main.ts             Phaser game bootstrap
  scenes/
    BootScene.ts       procedurally generates all textures
    MenuScene.ts        title screen
    GameScene.ts         core gameplay loop, spawning, collisions, HUD
    GameOverScene.ts    score + restart
  objects/
    Player.ts           movement, aiming, firing, ammo, powerups, shield
    Enemy.ts             enemy variants (basic/shooter/extra)
    Pickup.ts             ammo/bomb/shield/random pickups
```

## Possible next steps

- Multiple levels with escalating difficulty/enemy patterns (current build is a single endless wave that scales via spawn weighting).
- Persist high scores (e.g. `localStorage`).
- Sound effects/music.
- Mobile/touch controls.

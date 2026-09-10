# BLACKOUT — Three.js starter

A working scaffold for the COMS3006A/COMS3025A CGV project, built around
the BLACKOUT concept brief (first-person AI-controlled substation escape).

## What's here

- **Vite + Three.js**, `base: './'` already set in `vite.config.js` so the
  build works once hosted in a subdirectory on the LAMP server (see the
  brief's section 6.2 — this is the #1 cause of a blank screen on hosting).
- **First-person controls** — `PointerLockControls` + WASD + sprint, with
  simple AABB collision against level geometry (`src/systems/playerControls.js`).
- **AI escalation state machine** — CALM → SUSPICIOUS → ALERT → HUNTING →
  LOCKDOWN, shown live in the HUD (`src/systems/aiState.js`).
- **Interaction system** — raycast-from-crosshair, `[E]` to interact, used
  for notes, keypads, switches, terminals (`src/systems/interaction.js`).
- **Fictional terminal command system** — the Level 2 signature mechanic
  from the story brief: `STATUS`, `SCAN GRID`, `AUTH <code>`,
  `ROUTE <node>`, `OVERRIDE WATER` (`src/systems/terminal.js`).
- **Custom shader** — `src/shaders/electricCorruption.js`, a hand-written
  vertex+fragment ShaderMaterial (scanlines, animated vein noise, time- and
  suspicion-driven vertex flicker) covering the Shaders rubric line item —
  make sure every teammate can explain it before the demo.
- **Three genuinely different levels**, each with its own mechanic per the
  story brief:
  - Level 1 (Infiltration): security camera detection cone + access-code puzzle.
  - Level 2 (Control): the terminal puzzle, story progression (water restored).
  - Level 3 (Core): switch-sequence puzzle, shader-driven "corrupted AI"
    set-piece, ending sequence.
- **Credits screen**, wired to `src/systems/credits.js` — add every asset,
  texture, sound, and tutorial you use there as you add it.
- **Loading screen, pause menu, restart-without-refresh, HUD** for the
  Polish rubric category.

## Running locally

```bash
npm install
npm run dev        # dev server with hot reload, http://localhost:5173
```

## Producing a deployable build (read this before your first LAMP upload)

```bash
npm run build       # writes dist/
npx serve dist       # sanity-check the BUILD, not the dev server
```

Then zip the **contents** of `dist/` (so `index.html` is at the top level
of the archive) and upload that to the Moodle submission. Do **not** upload
`node_modules/`, `src/`, or `package.json` — the LAMP server only serves
static files and will not run a build step for you.

## Where to go from here

This scaffold intentionally uses procedural boxes instead of modelled
assets so it builds and hosts cleanly out of the box. Natural next steps,
roughly in the order the rubric rewards them:

1. Swap the box rooms/props for real models (`.glb`, Draco-compressed —
   see brief section 6.1) without breaking the relative-path loading.
2. Add real textures (with bump/normal maps) to hit the "textures used for
   more than colour" line in the 3D Effects rubric row.
3. Expand the AI camera/detection logic in Level 1 into something that
   actually chases the player once LOCKDOWN is reached.
4. Add sound design — ambient hum, terminal beeps, alarm stingers — the
   rubric calls this out explicitly under Gameplay & Experience.
5. Second and third custom shaders if you want to push further into the
   top band of the Shaders category (currently there's one).
6. Multiple camera views (e.g. a security-camera picture-in-picture) for
   the Viewing category's top band.

## Credits already included

- Three.js (MIT) — threejs.org
- `PointerLockControls` from the Three.js examples (MIT)

Everything else — models, textures, audio, fonts, any tutorial you lean on
— goes in `src/systems/credits.js` as you add it, per the brief's
"credit anything you'd feel awkward being asked about" rule.

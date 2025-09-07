# Architecture Overview

This document explains the high‑level structure and the gameplay architecture so new contributors (and reviewers) can orient quickly.

## UI (React + Vite)

- `src/App.jsx` — main composition and view state
  - Search, categories, view toggles
  - Practice Mode (Quiz • Arcade • Playground)
  - Commands grid (CommandCards), filtered by search/category and “Show plugin extras”
- Components:
  - `CommandCard.jsx`, `CommandModal.jsx`, `CommandPalette.jsx`
  - `Playground.jsx` (Vim motions playground)
  - `ArcadePanel.jsx` (Phaser mount; fixed 640×360 canvas with HiDPI resolution)

## Arcade (Phaser 3)

- `src/game/GameScene.js` — self‑contained game scene
  - Minimal preload + vector fallback ship
  - Physics groups: enemies, player bullets, enemy bullets
  - UI: controls banner, HP bars (player in green, boss in purple), score, wave
  - Audio: synthesised SFX via WebAudio (unlock hint in non‑debug)
  - Collisions: pooled bullets with re‑enabled bodies; overlap safety; player/boss collider (bounce + damage)
  - Waves: letters‑only with aggression ramp; boss on wave 5 only
- `src/game/waves.js` — pure helpers (thresholds, boss gating, next wave logic)

### Collisions & Reliability

- Bullets are pooled. Before firing, their physics bodies are re‑enabled and sized (12×12) to reduce tunneling.
- Boss body uses a centered rectangle sized to 60% of sprite; set `immovable` and `pushable=false` for clear contact.
- Overlaps are registered both orders (bullets→boss, boss→bullets) and a per‑frame safety overlap is run to catch edge cases.

### Reduced Motion & Pause

- Respect `prefers-reduced-motion`: reduced particles, no camera shake/flash.
- Pause on tab blur with a simple overlay; resume on focus.

## Testing & Quality

- Vitest tests under `src/__tests__/` include data validation, modal a11y, and wave rules.
- ESLint (flat) + Prettier scripts available; CI runs lint + format check + tests + build.

## Data Sections

- Lesson data lives in `src/data/sections/*.json` and is loaded via Vite `import.meta.glob` in `src/data/index.js`.
- File names are for maintainers only; the app sorts by the JSON `category` field, not the filename.
- Keep one source of truth per category to avoid duplicate items. Prefer the detailed, zero‑padded files (for example, `01-…`, `02-…`).
- Older duplicate stubs have been removed, and unique categories (for example, Text objects and Plugins) were normalized.

## Build & PWA

- Vendor chunks for `phaser` and `react` for faster first load.
- PWA excludes large images from precache; uses runtime caching for assets.

## Notes

- The game targets simplicity and reliability over micro‑optimisation.
- Phaser scene stays lean; helpers are pure where practical (e.g., `waves.js`).

# AI Workflow

Start with app-owned folders. Avoid `vendor/5etools-src-main` unless source/reference data is required.

## Renderer Extraction Plan

- Keep presentation-only changes in `src/app/renderer/styles.css`.
- Keep renderer bootstrap, loading, persistence, and page setup in `src/app/renderer/renderer.js`.
- Keep DOM wiring for spell, feat, and rest interactions in `src/app/renderer/index.html`.
- Keep long-rest and resource-state calculations, transitions, and reset/spend updates in `src/engine/rests/long-rest.js` and `src/engine/resources/resource-state.js`.
- Use the inline marker comments in `src/app/renderer/index.html` to jump to the remaining monolith sections instead of scanning the whole file.

## Common Tasks

- Fix a feat: inspect `src/data/feats`, `src/engine/feats`, `src/ui/skills`, `src/ui/attacks`, then search `src/app/renderer/index.html` for `INLINE FEAT/FEATURE MECHANICS`, `INLINE BACKGROUND FEAT RESOLUTION`, `INLINE FEAT PROFICIENCY EFFECTS`, and `INLINE FEAT TRAIT TEXT`.
- Fix a spell: inspect `src/data/spells`, `src/engine/spells`, `src/ui/sheet`, then search `src/app/renderer/index.html` for `INLINE SPELL/REST MECHANICS` and `INLINE SPELL UI`.
- Fix long rest: inspect `src/engine/rests/long-rest.js`, `src/engine/resources/resource-state.js`, `src/services/save-service.js`, then search `src/app/renderer/index.html` for `INLINE SPELL/REST MECHANICS`, `applyLongRestRecovery`, and `longRestSpellResources`.
- Fix character sheet UI: inspect `src/ui/sheet`, `src/app/renderer/styles.css`, `src/app/renderer/renderer.js`, and only then any relevant inline renderer mechanics.
- Fix Electron startup or file loading: inspect `src/app/main`, `src/app/preload`, and `src/services/data-loader.js`.
- Fix save/load behavior: inspect `src/services/save-service.js`, `src/app/main/main.js`, `src/app/preload/preload.js`, `src/app/renderer/renderer.js`, and the save-slot helpers in `src/app/renderer/index.html`.
- Slot-aware persistence uses `window.dndSheet.loadStore()`, `saveStore(store)`, and `clearSlot(slotId)` when running in Electron; keep `sheet:load`, `sheet:save`, and `sheet:clear` compatible for old renderer calls.
- Fix translation behavior: inspect `src/services/translation-service.js`.
- Change packaged files: inspect `package.json` build `files`.

## Vendor Rules

Do not search all of `vendor/5etools-src-main` by default. It is large and expensive for token usage.

Use vendor only when:

- App-owned data needs to be compared against original 5etools source data.
- A loader references a specific vendor JSON file.
- A bug depends on raw 5etools field shape.

Prefer exact paths such as:

- `vendor/5etools-src-main/data/feats.json`
- `vendor/5etools-src-main/data/races.json`
- `vendor/5etools-src-main/data/backgrounds.json`
- `vendor/5etools-src-main/data/class/index.json`
- `vendor/5etools-src-main/data/class/class-*.json`
- `vendor/5etools-src-main/data/items.json`
- `vendor/5etools-src-main/data/items-base.json`
- `vendor/5etools-src-main/data/languages.json`

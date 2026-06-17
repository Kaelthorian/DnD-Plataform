# AI Workflow

Start with app-owned folders. Avoid `vendor/5etools-src-main` unless source/reference data is required.

## Common Tasks

- Fix a feat: inspect `src/data/feats`, `src/engine/feats`, `src/ui/skills`, `src/ui/attacks`, then relevant sections in `src/app/renderer/index.html` while the monolith remains.
- Fix a spell: inspect `src/data/spells`, `src/engine/spells`, `src/ui/sheet`, then spell sections in `src/app/renderer/index.html`.
- Fix long rest: inspect `src/engine/rests`, `src/engine/resources`, `src/services/save-service.js`, and the long-rest functions in `src/app/renderer/index.html`.
- Fix character sheet UI: inspect `src/ui/sheet` and `src/app/renderer`.
- Fix Electron startup or file loading: inspect `src/app/main`, `src/app/preload`, and `src/services/data-loader.js`.
- Fix save/load behavior: inspect `src/services/save-service.js` and renderer calls to `window.dndSheet`.
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

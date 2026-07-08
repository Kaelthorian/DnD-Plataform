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
- Fix or add player-facing UI text: add it through `src/app/renderer/i18n.js` first. English is the source language, Spanish must have a matching key, and new visible player-facing strings must not be hardcoded directly in HTML, JSX, or JS. See `docs/i18n.md` and run `npm run test:i18n`.
- Fix backgrounds: inspect `src/data/backgrounds/backgrounds.json`, `src/services/data-loader.js`, `loadBackgroundOptions()` and `loadBackgroundDetails()` in `src/app/renderer/renderer.js`, then search `src/app/renderer/index.html` for `findBackgroundChoicesForOption`, `applySelectedBackgroundChoices`, `updateBackgroundSkillProficiencies`, `calculateOtherProficienciesAndLanguages`, and `INLINE BACKGROUND FEAT RESOLUTION`.
- Fix Electron startup or file loading: inspect `src/app/main`, `src/app/preload`, and `src/services/data-loader.js`.
- Fix save/load behavior: inspect `src/services/save-service.js`, `src/app/main/main.js`, `src/app/preload/preload.js`, `src/app/renderer/renderer.js`, and the save-slot helpers in `src/app/renderer/index.html`.
- Slot-aware persistence uses `window.dndSheet.loadStore()`, `saveStore(store)`, and `clearSlot(slotId)` when running in Electron; keep `sheet:load`, `sheet:save`, and `sheet:clear` compatible for old renderer calls.
- Fix translation behavior: inspect `src/services/translation-service.js`.
- Fix live sheet sharing: inspect `src/services/live-sheet-server.js`, the `live-sheet:*` handlers in `src/app/main/main.js`, `window.dndSheet.liveSheet` in `src/app/preload/preload.js`, the Connect to DM controls in `src/app/renderer/renderer.js`, and the Live Players panel in `src/app/renderer/dm-screen/src/main.jsx`.
- Live sheet sharing is local LAN only over WebSocket. Do not add cloud relay, accounts, or automatic writes into save slots; remote player data stays memory-only unless a future explicit save feature is designed.
- Keep player-card parsing centralized through `characterFromSheetData(data)` in the DM Screen. If sheet fields change, update that parser instead of adding a second live-player parser.
- Fix Obsidian vault integration: inspect `src/services/obsidian-service.js`, the `obsidian:*` handlers in `src/app/main/main.js`, `window.dndSheet.obsidian` in `src/app/preload/preload.js`, and the Obsidian picker/note components in `src/app/renderer/dm-screen/src/main.jsx`.
- Obsidian notes are local filesystem reads only. Keep all vault-relative path validation in `src/services/obsidian-service.js`; renderers must not receive arbitrary absolute paths.
- To select a vault, open the DM Screen, right-click the board, choose `Add Obsidian Note`, then use `Select Vault`. The chosen folder is remembered in Electron `userData`.
- To add a note, search the Obsidian picker by title, file name, relative path, or excerpt, then press `Add note`. Open notes persist on the DM board by relative path and reload content from the current vault.
- To edit a note, use `Edit` in the DM Screen Obsidian note window and `Save` to write back to the local `.md` file through `obsidian:write-note`.
- First Obsidian implementation limitations: no iframe/webview embedding, no required Obsidian plugin, no cloud sync, no advanced Markdown tables/callouts, and image embeds are limited to safe local `.png`, `.jpg`, `.jpeg`, `.webp`, and `.gif` files inside the selected vault.
- Change packaged files: inspect `package.json` build `files`.

## Background Safety Notes

- Do not edit `vendor/5etools-src-main` for background fixes unless the task is explicitly a vendor data sync.
- The selector list comes from `src/data/backgrounds/backgrounds.json`; vendor details only enrich mechanics when an exact structured match exists.
- Keep save data compatible: background fields store display names, while background choices live under `__sheetMeta.choices`.
- Names that differ only by punctuation can be distinct backgrounds. Keep exact display-name matching in selector code so `Gate Warden` and `Gate-Warden` do not collapse into one option.
- Run `node scripts/diagnose-backgrounds.js` after background changes. Use `--list` for the full loaded background inventory and normalized field summary.
- Known limitation: 110 current backgrounds use local text fallback because no structured vendor detail exists. For those, simple proficiencies/equipment can be parsed from text, but complex mechanics may only appear as generated feature text.

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

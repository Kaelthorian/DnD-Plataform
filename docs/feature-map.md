# Feature Map

This map describes where systems should live after staged extraction. Some behavior still lives in `src/app/renderer/index.html`.

## Renderer Split

- HTML shell and remaining inline mechanics: `src/app/renderer/index.html`
- Extracted renderer infrastructure: `src/app/renderer/renderer.js`
- Extracted renderer stylesheet: `src/app/renderer/styles.css`

Remaining gameplay-heavy inline sections inside `src/app/renderer/index.html` are marked with searchable comments:

- `INLINE SPELL/REST MECHANICS`
- `INLINE SPELL UI`
- `INLINE FEAT/FEATURE MECHANICS`
- `INLINE BACKGROUND FEAT RESOLUTION`
- `INLINE FEAT PROFICIENCY EFFECTS`
- `INLINE FEAT TRAIT TEXT`

## Data

- Classes: `src/data/classes`
- Races: `src/data/races`
- Backgrounds: `src/data/backgrounds`
  - The active selector source is `src/data/backgrounds/backgrounds.json`, loaded through `src/services/data-loader.js`, `src/app/main/main.js`, `src/app/preload/preload.js`, and `loadBackgroundOptions()` in `src/app/renderer/renderer.js`.
  - Structured background mechanics are read from `vendor/5etools-src-main/data/backgrounds.json` by `loadBackgroundDetails()` and mapped in `src/app/renderer/index.html`.
  - Current audit baseline: 245 selector backgrounds, 135 structured vendor details after modern-source dedupe, and 110 text-fallback backgrounds.
- Spells: `src/data/spells`
- Feats: `src/data/feats`
- Items: `src/data/items`
- Languages: `src/data/languages`

## Mechanics

- Characters: `src/engine/characters`
- Spells: `src/engine/spells`
- Feats: `src/engine/feats`
- Background choice/application logic still lives in `src/app/renderer/index.html`:
  - selector description and choice controls near `findBackgroundChoicesForOption()`
  - ability-score/background choice state near `backgroundAbilityScoreChoiceState()`
  - generated equipment/currency near `applySelectedBackgroundChoices()`
  - generated skills near `updateBackgroundSkillProficiencies()`
  - languages/tools in `calculateOtherProficienciesAndLanguages()`
  - background feats/features under `INLINE BACKGROUND FEAT RESOLUTION`
- Rests: `src/engine/rests`
- Long-rest transitions and recovery math: `src/engine/rests/long-rest.js`
- Conditions: `src/engine/conditions`
- Resources: `src/engine/resources`
- Resource use state normalization, spending, and reset math: `src/engine/resources/resource-state.js`
- Proficiencies: `src/engine/proficiencies`
- Attacks: `src/engine/attacks`
- Skills: `src/engine/skills`
- Saves: `src/engine/saves`

## UI

- Character sheet: `src/ui/sheet`
- Skills: `src/ui/skills`
- Attacks: `src/ui/attacks`
- Inventory: `src/ui/inventory`
- Modals and drawers: `src/ui/modals`
- Selection menus: `src/ui/selectors`

## Dice Rolling

- Roll mechanics and result text still live in `src/app/renderer/index.html` near `rollDiceExpression`, `rollAttack`, `rollD20Check`, `rollDamage`, and `showDiceTray`.
- 3D dice rendering lives in `src/app/renderer/dice-roller.js`; `index.html` passes visual entries as `{ sides, value }` through `animateDiceRoll3d(diceVisuals)`.
- The 3D dice overlay is controlled by the global settings menu in `src/app/renderer/index.html` and persisted by `src/app/renderer/renderer.js` under `dnd-character-sheet-ui-settings-v1`; the default is off.
- Free dice rolling and the dice log live in `src/app/renderer/index.html`; free rolls support d2 through d100 and the recent roll log is stored in `localStorage` under `dnd-character-sheet-dice-log-v1`.
- Die colors can be customized before rolls by setting `window.diceRollerConfig.colors` with keys such as `4`, `6`, `8`, `10`, `12`, `20`, `natural20`, and `natural1`.
- Optional dice sounds are looked up at `src/app/renderer/assets/sfx/dice-roll.mp3` and `src/app/renderer/assets/sfx/dice-land.mp3`. Missing files are ignored, and custom paths can be supplied through `window.diceRollerConfig.sounds`.

## Services

- Data loading: `src/services/data-loader.js`
- Save state: `src/services/save-service.js`
  - Character sheets use the existing `character-sheet.json` path with a versioned multi-slot store.
  - Store format is `version: 2`, `activeSlotId`, and six fixed slots containing `{ id, name, updatedAt, data }`.
  - Old single-sheet saves are migrated into `slot-1` without deleting player data.
- Translation: `src/services/translation-service.js`
- Live sheet sharing: `src/services/live-sheet-server.js`
  - Electron main owns the local WebSocket host through IPC handlers in `src/app/main/main.js`.
  - Preload exposes the safe renderer API at `window.dndSheet.liveSheet`.
  - Character sheet client controls live in `src/app/renderer/index.html` and `src/app/renderer/renderer.js`.
  - DM live player cards live in `src/app/renderer/dm-screen/src/main.jsx` and reuse `characterFromSheetData(data)`.
  - Data is memory-only on the DM side and is never written into local save slots automatically.

## Manual Test Checklist

- Run `node scripts/diagnose-backgrounds.js --list` and confirm `Errors: 0`.
- Open the character sheet background selector and confirm both `Gate Warden` and `Gate-Warden` appear.
- Select `Acolyte`; confirm ability-score controls, Insight/Religion, Magic Initiate, and equipment/currency populate.
- Save, switch to another save slot, switch back, and confirm the selected background and background choices remain.
- Clear the active slot and confirm generated background choices/equipment are removed without changing other slots.
- Start DM host from DM Screen.
- Connect one local player from the character sheet with `127.0.0.1` or the displayed LAN IP.
- Edit current HP and confirm the DM Screen card updates.
- Disconnect the player and confirm the last card remains marked disconnected.
- Restart the server and connect again.
- Confirm the app still starts normally.

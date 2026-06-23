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
- Spells: `src/data/spells`
- Feats: `src/data/feats`
- Items: `src/data/items`
- Languages: `src/data/languages`

## Mechanics

- Characters: `src/engine/characters`
- Spells: `src/engine/spells`
- Feats: `src/engine/feats`
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

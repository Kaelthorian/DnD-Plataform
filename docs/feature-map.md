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
- Conditions: `src/engine/conditions`
- Resources: `src/engine/resources`
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

## Services

- Data loading: `src/services/data-loader.js`
- Save state: `src/services/save-service.js`
- Translation: `src/services/translation-service.js`

# Feature Map (legacy summary)

The maintained detailed map is [`feature-map.md`](./feature-map.md). Use [`REPOSITORY_MAP.md`](./REPOSITORY_MAP.md) first for task routing. This file remains as a compatibility entry point because both case variants are currently tracked.

This is the high-signal map for future agents.

| System | Data | Behavior | UI | Saved State | Tests |
| --- | --- | --- | --- | --- | --- |
| Feats | `src/data/feats` | `src/engine/feat-registry.js`, `src/engine/feats` | `src/ui/sheet`, `src/ui/skills`, `src/ui/attacks`, temporary renderer code | `src/services/save-service.js` stores full sheet state | `tests/engine/feat-registry.test.js` and future feat handler tests |
| Spells | `src/data/spells/spells.json`, `spell.schema.json`, `spells.manifest.json`; sync/validation in `scripts/` | `src/engine/spells/spell-data.js` provides source-aware normalization, generic profiles, embedded-weapon and deferred-rider classification; `spell-registry.js` is only a legacy extension point | selection/preparation/sheet/combat in `index.html`; loading/identity in `renderer.js`; DM library in `dm-screen/src/main.jsx` | full sheet save plus source-aware `__sheetMeta.spellReferences` and temporary `activeSpellAttackEffects`; legacy name/level fallback remains | `scripts/validate-spells.js`, `tests/engine/spell-data.test.js`, registry/renderer/combat tests, DM build |
| Classes | `src/data/classes` | `src/engine/characters`, `src/engine/resources` | `src/ui/sheet`, `src/ui/selectors` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Races | `src/data/races` | `src/engine/characters`, `src/engine/proficiencies` | `src/ui/sheet`, `src/ui/selectors` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Items | `src/data/items/items.json` plus shared metadata in `items-base.json`; maintenance through `scripts/sync-items.js` | stable identity/profiles in `src/engine/items/item-catalog.js`, resource transitions in `item-resource-state.js`, sheet adapters in `index.html` | Character Sheet equipment/picker/combat in `index.html`; indexing in `renderer.js`; DM library in `dm-screen/src/main.jsx` | equipment text plus source/variant references, `__sheetMeta.itemResources`, `itemAttunement`, `itemEffects`; DM notes keep `catalogId` and snapshot | `npm run test:items`, renderer integration tests, service cache tests and DM build |
| Rests | Usually sheet state, no standalone data yet | `src/engine/rests`, `src/engine/resources` | `src/ui/sheet` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Electron IO | n/a | `src/services/data-loader.js`, `src/services/save-service.js`, `src/services/translation-service.js` | `src/app/preload` exposed API | `src/services/save-service.js` | Future service tests |

## Large File

`src/app/renderer/index.html` still contains extracted-candidate code for all systems. Do not read it first unless the smaller files do not answer the task.

Spell presence in the catalog does not mean full rules automation. Structured profiles drive reusable attack/save/damage/healing/resource/concentration flows; target geometry, private enemy state, material inventory, summons, transformations, and open-ended choices remain guided/manual unless another implemented subsystem owns them. See [`ADDING_SPELLS.md`](./ADDING_SPELLS.md) and [`COMBAT.md`](./COMBAT.md).

Item presence follows the same boundary: deterministic equipment, resource and combat adapters are automated, while contextual or narrative effects remain visible and guided. See [`ADDING_ITEMS.md`](./ADDING_ITEMS.md).

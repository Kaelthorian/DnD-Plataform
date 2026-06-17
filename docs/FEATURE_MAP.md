# Feature Map

This is the high-signal map for future agents.

| System | Data | Behavior | UI | Saved State | Tests |
| --- | --- | --- | --- | --- | --- |
| Feats | `src/data/feats` | `src/engine/feat-registry.js`, `src/engine/feats` | `src/ui/sheet`, `src/ui/skills`, `src/ui/attacks`, temporary renderer code | `src/services/save-service.js` stores full sheet state | `tests/engine/feat-registry.test.js` and future feat handler tests |
| Spells | `src/data/spells` | `src/engine/spell-registry.js`, `src/engine/spells` | `src/ui/sheet`, `src/ui/selectors`, temporary renderer code | `src/services/save-service.js` stores full sheet state | `tests/engine/spell-registry.test.js` and future spell handler tests |
| Classes | `src/data/classes` | `src/engine/characters`, `src/engine/resources` | `src/ui/sheet`, `src/ui/selectors` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Races | `src/data/races` | `src/engine/characters`, `src/engine/proficiencies` | `src/ui/sheet`, `src/ui/selectors` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Items | `src/data/items`, vendor item data loaded by service | `src/engine/attacks`, `src/engine/resources` | `src/ui/inventory`, `src/ui/attacks` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Rests | Usually sheet state, no standalone data yet | `src/engine/rests`, `src/engine/resources` | `src/ui/sheet` | `src/services/save-service.js` | Future tests in `tests/engine` |
| Electron IO | n/a | `src/services/data-loader.js`, `src/services/save-service.js`, `src/services/translation-service.js` | `src/app/preload` exposed API | `src/services/save-service.js` | Future service tests |

## Large File

`src/app/renderer/index.html` still contains extracted-candidate code for all systems. Do not read it first unless the smaller files do not answer the task.

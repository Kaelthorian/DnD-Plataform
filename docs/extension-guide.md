# Extension Guide

Keep data declarative, mechanics in `src/engine`, UI in `src/ui`, and IO in `src/services`.

## Add a New Spell

1. Add declarative spell data under `src/data/spells`.
2. Add mechanical behavior under `src/engine/spells/handlers` only if the spell needs automation.
3. Add shared spell helpers under `src/engine/spells/utils`.
4. Update sheet rendering or selectors under `src/ui/sheet` or `src/ui/selectors`.
5. While `index.html` is monolithic, wire the new data/handler through the relevant spell section there.

Do not implement spell behavior inside the data file.

## Add a New Feat

1. Add declarative feat data under `src/data/feats`.
2. Add mechanical effects under `src/engine/feats/handlers`.
3. Add shared feat helpers under `src/engine/feats/utils`.
4. Update affected UI in `src/ui/skills`, `src/ui/attacks`, `src/ui/sheet`, or `src/ui/selectors`.
5. Compare against `vendor/5etools-src-main/data/feats.json` only if source data is needed.

## Add a New Class

1. Add class data under `src/data/classes`.
2. Add class-specific mechanics under `src/engine/characters`, `src/engine/resources`, or the relevant rule domain.
3. Update class selectors and sheet displays under `src/ui/selectors` and `src/ui/sheet`.
4. Use `vendor/5etools-src-main/data/class` only as a reference.

## Add a New UI Window

1. Add rendering code under the closest `src/ui/<domain>` folder.
2. Keep DOM creation/event handling in UI modules.
3. Expose any needed file or app lifecycle API through `src/app/preload` and `src/app/main`.
4. Keep persistence in `src/services/save-service.js` or a new service.

## Add a New Rest Resource

1. Define the resource shape under `src/engine/resources`.
2. Add rest recovery rules under `src/engine/rests`.
3. Update sheet UI under `src/ui/sheet` if the resource is visible.
4. Update save/load only if the saved state shape changes.

## Add a New Skill or Attack Action

1. Add calculation rules under `src/engine/skills` or `src/engine/attacks`.
2. Add related proficiency/resource helpers under `src/engine/proficiencies` or `src/engine/resources`.
3. Add rendering and interaction under `src/ui/skills` or `src/ui/attacks`.
4. Keep dice/result display UI separate from rule calculation.

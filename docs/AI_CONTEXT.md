# AI Context

Use this file first when starting a task. The goal is to keep most feat or spell fixes to 3-6 files.

## Do Not Start In Vendor

Do not inspect `vendor/5etools-src-main` unless source data is explicitly needed. Most work should start in `src` and `docs`.

## Fast Paths

Feat fix:

1. `src/data/feats`
2. `src/engine/feat-registry.js`
3. `src/engine/feats/handlers/<feat-id>.js`
4. Relevant UI folder: usually `src/ui/sheet`, `src/ui/skills`, or `src/ui/attacks`
5. Tests in `tests/engine`
6. Only then inspect matching sections in `src/app/renderer/index.html` while the renderer is still monolithic

Spell fix:

1. `src/data/spells`
2. `src/engine/spell-registry.js`
3. `src/engine/spells/handlers/<spell-id>.js`
4. Relevant UI folder: usually `src/ui/sheet` or `src/ui/selectors`
5. Tests in `tests/engine`
6. Only then inspect matching sections in `src/app/renderer/index.html` while the renderer is still monolithic

Electron/file loading fix:

1. `src/app/main/main.js`
2. `src/app/preload/preload.js`
3. `src/services/data-loader.js`
4. `src/services/save-service.js`

## System Locations

Data lives in `src/data/<system>`.

Behavior lives in `src/engine/<system>`.

UI lives in `src/ui/<system>` and temporarily in `src/app/renderer/index.html`.

State is saved through `src/services/save-service.js`.

Tests live in `tests/engine` for isolated rules/registries.

## Current Constraint

`src/app/renderer/index.html` is still large and contains much of the existing behavior. Prefer adding new isolated handlers and docs now; extract renderer code in small staged follow-ups.

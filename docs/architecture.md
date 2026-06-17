# Architecture

This repository is organized so app-owned code is separate from external reference material.

## Boundaries

- `src/app/main`: Electron app lifecycle and IPC registration only.
- `src/app/preload`: safe renderer API exposure only.
- `src/app/renderer`: current browser entry point. `index.html` is still monolithic and should be split in later staged work.
- `src/services`: file loading, save state, and translation helpers used by Electron main.
- `src/data`: app-owned data. These files should remain declarative JSON without complex behavior.
- `src/engine`: intended home for mechanical rules such as spells, feats, rests, attacks, skills, saves, resources, proficiencies, and conditions.
- `src/ui`: intended home for renderer components and window-specific UI modules.
- `vendor/5etools-src-main`: external/reference data and source. Treat it as vendor material. Do not use it as core app logic.

## Current State

The safe refactor moved files and centralized main-process loaders. It did not rewrite gameplay behavior.

Large/risky file left intact:

- `src/app/renderer/index.html`: contains UI rendering, data normalization, character mechanics, spell/feat logic, inventory logic, rest behavior, and derived-stat updates. Splitting this file should be done system by system with behavior tests or manual smoke checks after each extraction.

## Direction

New behavior should be placed in the narrowest module:

- Data definitions in `src/data/<domain>`.
- Rules and calculations in `src/engine/<domain>`.
- DOM rendering and event handlers in `src/ui/<domain>`.
- Disk/network/Electron IO in `src/services` or `src/app/main`.

Avoid adding new gameplay code to Electron main/preload or to vendor files.

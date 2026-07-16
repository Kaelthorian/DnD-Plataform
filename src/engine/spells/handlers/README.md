# Spell Handlers

This folder is reserved for exceptional deterministic spell or spell-family adapters that cannot be represented by `spellBehaviorProfile()` and existing renderer/combat systems.

Do not add one handler per catalog entry, empty registration stubs, or a parallel damage/save/concentration/effect pipeline. Prefer structured canonical metadata and reusable generic flows. A new handler needs a narrow contract, a focused engine test, explicit wiring in the real runtime, and documentation of any remaining guided/manual steps.

`src/engine/spell-registry.js` is a legacy extension registry. Registration alone does not make a spell functional or automated.

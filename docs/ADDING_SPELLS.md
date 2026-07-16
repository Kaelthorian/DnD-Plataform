# Adding and Synchronizing Spells

The runtime spell catalog is `src/data/spells/spells.json`. Canonical records are generated from a reviewed external JSON source; the external file is an import input, not a runtime dependency. `src/data/spells/spell.schema.json` defines the normalized runtime record. `src/data/spells/spells.manifest.json` records the canonical digest, counts, intentional same-name variants, behavior coverage, and reference hashes used for the last synchronization.

Read `src/engine/spells/AGENTS.md` before changing spell data or runtime behavior.

## Identity and compatibility

- A spell record is audited by normalized name, source, and level. Its stable saved `id` is source-aware (`<name>--<source>`), so name+source must also be unique; level remains in serialized references for validation and legacy fallback.
- Same-name records from different sources are valid, including variants at different levels. Never deduplicate the catalog by display name alone; a same-name/same-source collision must be resolved before import because it cannot produce a unique compatible `id`.
- Name normalization trims and lowercases but deliberately preserves punctuation. Names that differ only by punctuation can be distinct records; changing this rule requires a catalog re-sync and save/reference compatibility review.
- The sheet stores source-aware references in `__sheetMeta.spellReferences`, while retaining name/level fallback lookup for old saves. Do not remove that fallback without a save migration.
- Canonical records retain their structured fields. Flattened `classes`, `races`, rendered `description`, icon fallback, and behavior flags are compatibility/derived fields produced by `spell-data.js`.
- Existing app-owned records whose names are absent from the canonical input are preserved as `canonical: false` local entries during synchronization.

## Synchronize canonical data

Run the synchronizer with the exact reviewed artifacts:

```powershell
node scripts/sync-spells.js --source <canonical-spells.json> --reference <spell-reference.md>
node scripts/validate-spells.js
```

The Markdown reference is optional and never overrides JSON. It contributes only audit hashes and heading counts. Use `--check` with the same inputs to prove that committed data and manifest can be reproduced without writing them:

```powershell
node scripts/sync-spells.js --source <canonical-spells.json> --reference <spell-reference.md> --check
```

`--output` and `--manifest` exist for isolated diagnostics. `--baseline-ref <git-ref>` is only for rebuilding import audit counts against a pre-sync catalog; it is not part of routine updates. Do not commit the external input files or add a runtime dependency on a Downloads path.

Review both generated files. Do not hand-edit a canonical record to fix drift: correct/review the canonical input and re-run synchronization. A deliberate local-only record must remain distinguishable from canonical data and pass the same validation.

## Runtime path

1. `src/services/data-loader.js` reads the committed catalog from `src/data/spells/spells.json`.
2. The main/preload data API exposes it to the character renderer. The packaged app includes `src/data/**` and `src/engine/**`, so structured spell metadata does not depend on unbundled vendor spell files.
3. `src/app/renderer/renderer.js` preserves source-aware variants while loading options and supplemental action metadata.
4. `src/app/renderer/index.html` owns the current known/prepared/selection UI, class/race eligibility, sheet fields, save compatibility, casting flows, and combat adapters.
5. `src/app/renderer/dm-screen/src/main.jsx` consumes the same structured helpers for spell-library search, metadata, and notes.
6. `src/engine/spells/spell-data.js` is the DOM-free CommonJS/browser module for normalization, formatting, lookup metadata, cantrip scaling, and `spellBehaviorProfile()`.

Do not route spell changes through the mostly placeholder `src/ui/*` folders or invent a second catalog, save path, or vendor-only runtime lookup.

## Behavior tiers

Catalog integration and complete rules automation are different responsibilities:

1. **Generic profile:** use structured canonical fields through `spellBehaviorProfile()` for attacks, saving throws, damage types, conditions, area tags, concentration, ritual, materials, healing, temporary HP, and scaling. Extend the shared parser/profile when a whole metadata family is missing.
2. **Guided reusable flow:** use the existing dice, spell attack, save, damage/healing, slot, resource, concentration, condition, effect, and combat-resolution paths in `index.html` when the rule maps to them.
3. **Manual adjudication:** targeting, map geometry, private enemy stats, inventories of costly/consumed materials, targeted or conditional temporary HP, mutually exclusive multi-mode saves/effects, summons, transformations, open-ended choices, persistent world effects, and other non-deterministic rules remain player/DM guided unless an existing authoritative subsystem supports them.

`AAD` requires distinguishing two reusable cases. `spellHasEmbeddedWeaponAttack()` identifies a weapon attack performed as part of the cast and `spellAttackSelections()` must compose it from equipped weapon rows. `spellHasDeferredAttackDamage()` identifies a persistent rider: the cast registers `__sheetMeta.activeSpellAttackEffects`, and later attacks offer it through `combatOptionalDamageChoices()`. Do not roll either category as unconditional damage at cast time.

There is no requirement for one handler file per spell. `src/engine/spell-registry.js` remains a small legacy extension registry; `src/engine/spells/handlers` is reserved for exceptional deterministic adapters that cannot be represented by generic metadata. Do not register empty handlers or claim that a catalog entry is fully automated merely because it has metadata.

## Integration checklist

For a canonical change, verify:

- Exact name/source/level identity and unique `id`.
- Structured casting time, range, components/material cost and consumption, duration/concentration, ritual, school, classes/races/subclasses, entries, attacks, saves, damage, conditions, AoE tags, and scaling.
- Selection/search/detail display and class/race eligibility in the character sheet, plus spell-library search/detail in the DM Screen.
- Known/prepared serialization and legacy name-based save loading.
- Existing combat/dice/resource behavior for the spell's generic profile; document any guided/manual rule boundary honestly.
- Embedded weapon attacks against every compatible equipped weapon, plus persistent/one-use `AAD` riders on a later attack and cleanup on Concentration/end-of-duration/Long Rest.
- HTTPS icon when supplied, otherwise the `school:<code>` fallback.
- Player-facing UI labels in both dictionaries; canonical spell names, descriptions, source codes, and lookup IDs are data, not i18n keys.

## Validation

```powershell
node scripts/validate-spells.js
node tests/engine/spell-data.test.js
npm run test:engine
npm run test:renderer
npm test
git diff --check
```

`validate-spells.js` applies `spell.schema.json`, checks the manifest digest/count and derived-field reproducibility, rejects exact-identity and ID duplicates, verifies class/race shape, rendered tag cleanup, and icon coverage. `tests/engine/spell-data.test.js` runs that validation plus a round trip over every record and representative regression assertions for tags, scaling, materials, duplicate-name variants, profiles, and preserved local entries. Unsupported class names are reported as warnings because the canonical catalog can reference classes not yet implemented locally. Same-name variant groups are reported by the manifest and are not errors when their source/level identities differ.

When behavior or selection UI changes, add a focused engine/renderer regression and perform the spell smoke test in `docs/TESTING.md`. When combat casting changes, also follow `docs/COMBAT.md`. When DM spell-library rendering changes, run `npm run build:dm-screen` and its smoke test.

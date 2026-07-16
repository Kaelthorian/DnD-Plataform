# Spell data engine

This directory owns pure, reusable spell-data interpretation. It does not own catalog IO, sheet DOM, slot persistence, dice UI, or authoritative map/target state.

## Active entry point

- `spell-data.js` is a UMD-style module used as CommonJS by scripts/tests and as `globalThis.dndSpellDataEngine` by the character renderer.
- Keep its exported helpers deterministic and DOM-free. Do not read files, mutate sheet state, or call renderer globals here.
- `src/data/spells/spells.json` is the packaged runtime catalog, `spell.schema.json` defines each normalized record, and `spells.manifest.json` proves canonical content. Synchronization and validation live in `scripts/sync-spells.js` and `scripts/validate-spells.js`.

## Invariants

- Audit identity is normalized name + source + level. Stable saved IDs use name+source, so that pair must also remain unique; duplicate display names are allowed across distinct sources and can carry different levels.
- `normalizeSpellName()` intentionally preserves punctuation after trim/lowercase because punctuation-distinct names can be separate records. Changing normalization or ID slugging requires a catalog re-sync plus an explicit save/reference compatibility review.
- Preserve canonical structured fields. `classSources`/`raceSources` retain source metadata, while flattened `classes`/`races` and rendered text support existing consumers.
- `canonicalSpellObject()` must exclude derived compatibility fields so the manifest digest represents the canonical input.
- Preserve legacy/local-only records and name/level fallback lookup for old saves. A source-aware reference may augment a legacy save but must not make it unreadable.
- Runtime and packaged builds must use committed app data. Never depend on an external import path or on vendor spell files that are absent from the package.

## Behavior boundary

Use `spellBehaviorProfile()` and the shared format/scaling helpers before adding special logic. The profile classifies structured metadata; it does not execute every rule.

- Generic: attacks, saves, damage types, conditions, AoE tags, concentration, ritual, material metadata, healing, temporary HP, and scaling.
- Guided: renderer/combat flows can consume that profile through existing dice, save, damage/healing, slot, resource, concentration, status, and effect systems. `directSelfTemporaryHitPointsExpression()` may authorize a sheet write only for an immediate, unambiguous caster grant. Embedded weapon attacks must reuse `spellHasEmbeddedWeaponAttack()` plus equipped weapon rows; persistent `AAD` riders must use `spellHasDeferredAttackDamage()` and `activeSpellAttackEffects`, never an immediate cast-time damage roll.
- Manual: geometry/targets, private creature state, material inventory enforcement, targeted/conditional temporary HP, mutually exclusive multi-mode saves/effects, open-ended choices, summons, transformations, shared-target charge ledgers, and persistent world effects remain DM/player adjudicated until an authoritative subsystem exists.

Do not create a handler merely because a spell exists. `handlers/` is for rare deterministic adapters that cannot be expressed by the generic path and have a focused regression. `src/engine/spell-registry.js` is a legacy extension registry, not proof of per-spell automation.

## Files that change together

- Canonical data: reviewed external JSON -> `scripts/sync-spells.js` -> `src/data/spells/spells.json` and `spells.manifest.json`; update `spell.schema.json` only when the normalized runtime contract changes.
- Normalization/profile semantics: `spell-data.js`, focused engine tests, and affected renderer/combat tests.
- Selection, preparation, save references, and casting adapters: `src/app/renderer/index.html`; loading/identity dedupe: `src/app/renderer/renderer.js`; DM spell-library search/detail: `src/app/renderer/dm-screen/src/main.jsx`.
- Visible UI labels: both dictionaries in `src/app/renderer/i18n.js`. Canonical names/descriptions/source codes/IDs are data and are not dictionary keys.

## Validation

```powershell
node scripts/validate-spells.js
node tests/engine/spell-data.test.js
npm run test:engine
npm run test:renderer
npm test
git diff --check
```

To reproduce a reviewed import without writes, also run:

```powershell
node scripts/sync-spells.js --source <canonical-spells.json> --reference <spell-reference.md> --check
```

The dataset-wide test validates every record and representative tag/scaling/material/profile cases. The `--check` inputs must be the same artifacts represented by the committed manifest. See `docs/ADDING_SPELLS.md` for the full workflow and `docs/COMBAT.md` for automation limits.

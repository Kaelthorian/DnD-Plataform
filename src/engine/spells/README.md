# Spells Engine

Pure spell-data interpretation lives here.

- `spell-data.js`: active CommonJS/browser entry point for source-aware IDs, canonical/legacy normalization, structured text and field formatting, class/race metadata, behavior profiles, safe direct-self temporary-HP detection, cantrip scaling, embedded weapon attacks, and deferred `AAD` riders.
- `AGENTS.md`: invariants, behavior boundaries, files that change together, and validation.
- `handlers/`: exceptional deterministic adapters only; the catalog does not require one handler per spell.
- `utils/`: reserved for helpers extracted from the active module when they have more than one real consumer.

The packaged catalog, normalized-record schema, and audit manifest live in `src/data/spells/`. Use `scripts/sync-spells.js`, `scripts/validate-spells.js`, and `tests/engine/spell-data.test.js`; see `docs/ADDING_SPELLS.md`.

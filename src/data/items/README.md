# Items Data

`items.json` is the app-owned source of truth for the active official item catalog and compact historical tombstones. `items-base.json` contains shared item metadata only; it must not reintroduce an active `baseitem` collection.

Do not hand-edit synchronized records. Use the dry-run/apply/check/restore workflow documented in [`docs/ADDING_ITEMS.md`](../../../docs/ADDING_ITEMS.md). External import files and `vendor/5etools-src-main` are reviewed inputs or development backups, not runtime catalogs. User-created homebrew remains outside this official catalog.

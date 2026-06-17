# Removable Systems

Remove systems by cutting references from app-owned modules first, then pruning data. Do not edit vendor files unless intentionally updating the external source snapshot.

## Remove Unused Spells

1. Remove app-owned spell entries from `src/data/spells`.
2. Remove spell handlers from `src/engine/spells/handlers`.
3. Remove UI references from `src/ui/sheet` and selectors.
4. While the renderer is monolithic, remove corresponding spell references from `src/app/renderer/index.html`.
5. Run app smoke tests and verify existing characters still load.

## Remove Unused Feats

1. Remove app-owned feat entries from `src/data/feats`.
2. Remove feat handlers from `src/engine/feats/handlers`.
3. Remove affected UI from `src/ui/skills`, `src/ui/attacks`, `src/ui/sheet`, or selectors.
4. Remove monolithic renderer references until extraction is complete.

## Remove Unused 5etools Data

1. Check `src/services/data-loader.js` and renderer fallback fetches for exact vendor paths.
2. Check `package.json` build `files` for packaged vendor paths.
3. Remove only unused vendor include paths from packaging first.
4. Keep `vendor/5etools-src-main` intact unless the source snapshot is intentionally being trimmed.

## Remove Unused UI Windows

1. Remove UI module files from `src/ui/<domain>`.
2. Remove renderer import/wiring references.
3. Remove preload/main IPC only if the window was the only caller.
4. Remove save-state fields only after migration or compatibility handling is decided.

## Remove Unused Mechanics

1. Remove handlers from `src/engine/<domain>`.
2. Remove registration/wiring from UI modules or renderer glue.
3. Remove data references last.
4. Run a save/load smoke test to catch stale saved fields.

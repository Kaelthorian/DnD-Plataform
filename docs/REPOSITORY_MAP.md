# Mapa del repositorio

Mapa operativo para evitar búsquedas globales repetidas.

| Necesidad | Empezar aquí | Continuar en |
| --- | --- | --- |
| Arranque, ventanas, IPC, updater | `src/app/main/main.js` | `src/app/preload/preload.js` |
| Hoja de personaje | `src/app/renderer/index.html` | `renderer.js`, `styles.css`, `i18n.js` |
| DM Screen/tablero/VTT | `src/app/renderer/dm-screen/src/main.jsx` | `dm-screen.html`, Vite config |
| Save slots/migración | `src/services/save-service.js` | helpers de slots en `index.html`, test de save service |
| Live Sheet | `src/services/live-sheet-server.js` | IPC main, preload, cliente en `renderer.js`, panel React |
| Obsidian | `src/services/obsidian-service.js` | IPC/preload y componentes React |
| Traducción | `src/services/translation-service.js` | `i18n.js` y `translateTextToSpanish()` en `index.html` |
| Backgrounds | `src/data/backgrounds/backgrounds.json` | `data-loader.js`, `renderer.js`, marcadores background en `index.html` |
| Spells | `src/data/spells/spells.json` | `spell-registry.js`, secciones spell/rest de `index.html` |
| Feats | `vendor/5etools-src-main/data/feats.json` | `feat-registry.js`, secciones feat de `index.html` |
| Items | vendor `items*.json` | inventario en `index.html`, biblioteca React |
| Cache/carga de items | `src/services/data-loader.js`, `src/services/workers/item-data-worker.js` | IPC `items:load`; cache compilada en `userData/data-cache/`; indice en memoria en `renderer.js` |
| Rests/recursos | `src/engine/rests/rest-state.js`, `src/engine/rests/short-rest.js`, `src/engine/rests/long-rest.js`, `src/engine/resources` | migración y wiring en `index.html`; estado privado no viaja al Live Sheet |
| Condiciones/acciones | `src/engine/conditions/statuses.js`, `src/engine/actions/action-advisor.js` | UI en `index.html` |
| Combate interactivo | `src/engine/combat/turn-economy.js`, `resolution-engine.js`, `action-definitions.js` | adaptadores/UI/log en `src/app/renderer/index.html`; `docs/COMBAT.md` |
| Build DM Screen | `scripts/ensure-dm-screen-build.js` | Comprueba por separado fuentes CSS y JS antes de invocar Tailwind/Vite; `dist/` es el runtime |
| Packaging/publicación | `package.json`, `scripts/run-electron-builder.js` | `crear-instalador.bat` solo con cautela |

## Directorios de alto nivel

- `src/app/main`, `src/app/preload`: frontera privilegiada Electron.
- `src/app/renderer`: dos aplicaciones de UI y assets.
- `src/services`: IO y networking testeables sin UI.
- `src/services/workers`: trabajo CPU/IO aislado del proceso main; actualmente parsea y cachea el catalogo grande de items. No accede al DOM ni al estado de hoja.
- `src/engine`: módulos ya extraídos; varios subdirectorios solo contienen README.
- `src/engine/combat`: motor implementado (no carpeta destino): economía, definiciones, pipeline y log; tiene instrucciones locales en `src/engine/combat/AGENTS.md`.
- `src/ui`: actualmente casi todo son README de destino; la UI real permanece en renderers.
- `src/data`: datos propios; `bestiary-sublist-data.json` es un dataset grande.
- `tests/engine`, `tests/services`, `tests/renderer`: scripts Node con `assert`.
- `vendor/5etools-src-main`: snapshot externo grande; buscar rutas exactas, no recorrer por defecto.
- `5etools-src-main`: dos archivos de feats no referenciados por runtime/package; candidato legado, no fuente activa.
- `Tokens`: 645 imágenes versionadas; main construye una biblioteca y resuelve tokens.
- `build`: icono de packaging.
- `installer-*`, `node_modules`, `.tools`: locales/generados e ignorados.

## Archivos grandes que requieren búsqueda dirigida

- `index.html`: usar comentarios `INLINE SPELL/REST MECHANICS`, `INLINE SPELL UI`, `INLINE FEAT/FEATURE MECHANICS`, `INLINE BACKGROUND FEAT RESOLUTION`, `INLINE FEAT PROFICIENCY EFFECTS` y `INLINE FEAT TRAIT TEXT`.
- La ventana central de combate reutiliza `turnActionRegistry`, `preparedAttackSelections()`, `castPreparedSpell()`, `showDiceTray()` y `activeStatusEffects()`. No crear contadores, dados o slots paralelos; adaptar definiciones en `registerTurnActionProviders()`.
- La coleccion de combate usa una fotografia revisionada y memoizacion por pasada. Los cambios de campos/meta deben llamar `invalidateCombatActionCache(...)`; no reintroducir escaneos de `items` ni validaciones que llamen `combatTurnState()` por cada tarjeta.
- `dm-screen/src/main.jsx`: buscar el componente o helper por concepto (`LivePlayersPanel`, `Map`, `Obsidian`, `Sound`, `characterFromSheetData`). Los tokens del mapa capturan sus propios eventos de puntero: actualizan la previsualización al arrastrar y persisten la posición al soltar.
- No editar manualmente `dm-screen/dist`; regenerar con `npm run build:dm-screen` después de cambiar source/config.
- `npm start` ejecuta `scripts/ensure-dm-screen-build.js`: CSS y JS tienen comprobaciones de vigencia independientes para que un bundle CSS sin cambios no fuerce reconstrucciones de Vite.

## Flujo de descansos 2024

- `src/engine/rests/rest-state.js` contiene la normalización idempotente de `__sheetMeta`, Hit Dice, gasto de dados, Exhaustion y clasificación explícita de `recharge`.
- `src/engine/rests/short-rest.js` y `src/engine/rests/long-rest.js` solo devuelven transiciones/resultados declarativos; no acceden al DOM.
- `src/app/renderer/index.html` aplica esos resultados a los campos PDF, `__sheetMeta`, la superficie existente `itemDrawer` y el estado Character Ready. Las interrupciones se enrutan por `globalThis.dndRestRuntime`.
- `src/app/renderer/renderer.js` conserva la sincronización pública de HP/HD/slots/Inspiration y no envía `__sheetMeta`.
- Validación específica: `node tests/engine/rests.test.js`; validación completa de engine: `npm run test:engine`.

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
- El administrador de spells construye un solo `createSpellSelectionSnapshot()` por apertura en `index.html`: las filas consumen sus grants, sets, conteos, límites y opciones accesibles, sin volver a ejecutar helpers globales por spell. Las elecciones de Features & Traits, raza y background pasan por `scheduleDerivedChoiceRefresh()` para pintar primero y agrupar después una sola `updateDerivedStats()`; esa pasada reutiliza `createSpellValidationSnapshot()` al sincronizar y validar spells. Los paneles de Equipment/Prepared Spells difieren su DOM mientras están fuera del viewport. Las mediciones `spell-picker-open` y `spell-picker-level-render` permiten comparar apertura y expansión desde Performance API. Las regresiones se validan con `node tests/renderer/spell-picker-performance.test.js` y `node tests/renderer/choice-response-performance.test.js`.
- La ventana flotante de combate reutiliza `turnActionRegistry`, `preparedAttackSelections()`, `castPreparedSpell()`, `showDiceTray()` y `activeStatusEffects()`. Su geometría persistente (`dnd-character-sheet-combat-window-v1`), arrastre, colapsado y resize viven en `index.html`; el lenguaje visual DM Screen vive en `styles.css`. No crear contadores, dados o slots paralelos; adaptar definiciones en `registerTurnActionProviders()`.
- Las demás superficies flotantes de trabajo de la hoja (`itemDrawer`, Character Statuses y Free Dice) se conectan mediante `attachFloatingSheetWindow()` al controlador común de `index.html`. Comparten el chrome `floating-sheet-window` de `styles.css`, se mueven por el header, colapsan, redimensionan por derecha/abajo/esquina y guardan geometría en claves `dnd-character-sheet-*-window-v1`. El contrato visual cubre también el contenido: fondos `#0a0a0a`/`#171717`/`#262626`, bordes neutros y acento ámbar; las variantes de spellbook no cargan `--sheet-background-image` ni `Spellbook.png`. `itemDrawer` sigue siendo la única superficie para inspectores y selectores de la izquierda: sus variantes no deben crear ventanas paralelas. Estas ventanas solo se cierran con su control de cierre o Escape, no por clic exterior.
- Todas las ventanas redimensionables usan el contrato visual `app-resize-corner`: la hoja lo define en `src/app/renderer/styles.css` para Start Combat, ventanas `floating-sheet-window` y notas de compañero; el DM Screen lo define en `dm-screen/styles.css` y lo aplica mediante `ResizeHandle`. Los bordes derecho/inferior siguen siendo áreas funcionales invisibles. Textareas y formas del mapa quedan fuera de este patrón de ventanas.
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

## Weapon Mastery 2024

- La elección inicial se genera en `src/app/renderer/index.html` desde el trait de clase y `vendor/5etools-src-main/data/items-base.json`: Fighter nivel 1 elige tres armas, y la progresión aumenta en niveles 4, 9 y 16. El drawer espera `itemCatalogReadyPromise` antes de construir las opciones; la detección del nombre debe permanecer normalizada porque los nombres canónicos usan mayúsculas.
- Las selecciones viven en `__sheetMeta.featureChoices` con valores `weapon-mastery:<arma>` y aparecen en el drawer existente de `Features & Traits`; no crear un store paralelo.
- Al iniciar un Long Rest con la hoja en Character Ready se guarda una instantánea en `__sheetMeta.restState.weaponMasteryChoices`. Weapon Drills permite reemplazar como máximo una elección; terminar el descanso exige completar el reemplazo y una interrupción restaura la instantánea.
- Validación específica: `node tests/engine/class-level3-mechanics.test.js`; los textos visibles EN/ES se validan con `npm run test:i18n`.

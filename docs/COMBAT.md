# Combate del Character Sheet

La ventana accesible desde el botón central de espadas es un ejecutor de turno local. Deriva opciones del personaje real, reserva costes mientras una acción está abierta y sólo confirma recursos al completar el flujo.

## Ventana flotante

- La superficie usa el lenguaje visual neutral/ámbar del DM Screen sin cambiar el motor ni los proveedores de acciones.
- El encabezado mueve la ventana; los bordes derecho, inferior y la esquina inferior derecha ajustan su tamaño.
- El control `−`/`+` colapsa o expande el contenido. La posición, tamaño y estado colapsado se conservan en `localStorage` bajo `dnd-character-sheet-combat-window-v1`.
- La geometría se limita al viewport al abrir y al redimensionar la aplicación. El panel es flotante y no bloquea la interacción con la hoja.

## Entradas y fuentes de verdad

| Responsabilidad | Fuente |
| --- | --- |
| Registro de proveedores | `src/engine/actions/action-advisor.js` y `registerTurnActionProviders()` |
| Economía/Extra Attack | `src/engine/combat/turn-economy.js`, persistido en `__sheetMeta.combatTurn` |
| Pipeline y rollback | `src/engine/combat/resolution-engine.js` |
| Acciones universales/perfiles | `src/engine/combat/action-definitions.js` |
| Tiradas reales | `rollD20WithMode()`, `rollDiceExpression()`, `summarizeD20Roll()` y `showDiceTray()` en `index.html` |
| Armas/inventario | campo PDF `Equipment`, `__sheetMeta.equippedItems`, datos vendor y `weaponAttackSelection()` |
| Hechizos | campos/checkboxes del PDF, registros locales/vendor, `spellAttackSelections()` y `castPreparedSpell()` |
| Features/raza/clase/subclase/feats | entradas generadas del renderer y registros vendor; `featureActionItemsFromEntries()` |
| Condiciones | `__sheetMeta.activeStatuses` y `src/engine/conditions/statuses.js` |
| Slots/usos/pools | helpers existentes del renderer y `src/engine/resources` |
| Registro | `__sheetMeta.combatLog` con respaldo local `dnd-character-sheet-combat-log-v1` |

## Flujo

1. `combatTurnState()` crea o migra el turno con Action, Bonus Action, Reaction, Movement, Object Interaction y ataques máximos.
2. Una tarjeta declarativa se valida y `createCombatResolution()` reserva el coste. El contador proyectado cambia mientras la sesión está abierta.
3. El stepper solicita sólo los pasos declarados: target, attack roll, save/check, damage/healing, efecto y confirmación.
4. Un ataque no habilita Damage hasta tener Hit; natural 1 falla, natural 20 marca crítico y duplica dados, no modificadores fijos.
5. Los saves y el daño automático no crean Hit Roll. Si el modificador/AC del target es privado, el jugador marca el resultado comunicado por el DM.
6. `Confirm Result` consume la economía y después usa los adaptadores existentes de slots, usos, inventario, munición, estados y log. `Cancel` revierte la reserva.
7. `End Turn` deja la Reaction restante disponible para tarjetas `allowOutsideTurn`; `New Turn` la restaura y elimina Dodge/Ready vencidos.

## Cobertura actual

- Acciones universales 2024, armas equipadas, Unarmed Strike, ataques otorgados por features, Grapple/Shove e Improvised Action.
- Hechizos preparados/conocidos clasificados por casting time y por Attack Roll, Saving Throw, daño automático, healing o utility. Conserva upcasting, uso gratis y slots existentes.
- Extra Attack, offhand/Bonus Action, Opportunity Attack, Readied Action, consumibles, ammo explícita, Sneak Attack una vez por turno, Action Surge y Concentration replacement.
- Movimiento manual normal/difficult/crawl/climb/swim/jump y Stand Up/Drop Prone.

## Rendimiento y caché

- `renderer.js` construye `itemLookupByName` una vez al recibir el catálogo. `findItemData()` debe resolver por `Map`, nunca con `items.filter(...)`.
- `collectCurrentTurnActions()` conserva una fotografía por `combatActionCacheRevision`; dentro de una pasada, `combatMemoValue()` comparte entradas de equipo, spells, features, feats, estados y Extra Attack.
- `updateDerivedStats()`, cambios de campos, recursos, estados, inicio/fin de turno y commits invalidan la fotografía. Abrir/cerrar sin cambios reutiliza el resultado.
- Los refrescos derivados se agrupan con `scheduleTurnActionsPanelRefresh()`/`requestAnimationFrame`. Confirmar una acción actualiza solo paneles afectados y no ejecuta el pipeline global de stats.
- `globalThis.dndCombatPerformance.samples()` expone las últimas muestras `collect`/`render` para diagnóstico desde DevTools; no se persisten.
- El primer acceso espera `itemCatalogReadyPromise` solo si la carga de fondo aún no terminó y muestra un estado explícito.

## Límites deliberados

- No hay aplicación automática de HP a enemigos ni lectura de AC/resistencias/saves privados. El log emite una propuesta para el DM.
- Range, línea de visión, terreno del mapa, targets de área y velocidades especiales todavía requieren validación manual; climb/swim usan coste 2x salvo adjudicación.
- Materiales costosos/consumibles se muestran desde metadata cuando existe, pero no hay un ledger estructurado de componentes en el inventario.
- Triggers de Reaction/Ready, efectos start/end, ongoing damage, recharge, summons/transformaciones y maniobras posteriores a una tirada no generan prompts automáticos.
- Live Sheet sólo reenvía las tiradas confirmadas. Falta el protocolo autoritativo host/DM para validar y aplicar economía, HP y efectos compartidos.

## Prueba manual

1. Abrir una hoja con arma equipada y pulsar las espadas. Confirmar los cinco recursos y `End Turn`; mover, redimensionar y colapsar la ventana, cerrarla y volver a abrirla para verificar persistencia.
2. Abrir un arma, indicar target/AC, tirar Hit y verificar que Damage estaba bloqueado antes. Probar natural 1/20 cuando sea posible y cancelar otra acción.
3. En un Fighter con Extra Attack, confirmar dos ataques: la primera confirmación consume Action y la segunda no.
4. Probar un spell attack, un spell con save (por ejemplo Fireball/Sacred Flame), Magic Missile y un healing spell. Cancelar antes de confirmar y comprobar el slot.
5. Gastar Bonus Action y Reaction; terminar el turno y comprobar que una Reaction `allowOutsideTurn` sigue disponible.
6. Probar Movement, Difficult Terrain, Stand Up, Drop Prone, Dash, un consumible y un arma con ammo registrada.
7. Guardar/cambiar de slot/volver. Confirmar que turno y combat log corresponden al slot.

Validación automática: `node tests/engine/combat.test.js`, `node tests/renderer/combat-ui.test.js`, `node tests/renderer/combat-performance.test.js`, `node tests/services/data-loader-cache.test.js`, `npm test` y `git diff --check`.

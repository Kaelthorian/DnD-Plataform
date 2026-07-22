# Combate del Character Sheet

La entrada principal es el botón **Combat** de la barra lateral de `src/app/renderer/index.html`. El botón **Player sheet** cierra esta superficie y devuelve la vista a la planilla; ambos controles reutilizan el mismo panel y estado de combate existentes.

La pantalla accesible desde el botón **Combat** de la barra lateral es un ejecutor de turno local. Deriva opciones del personaje real, reserva costes mientras una acción está abierta y sólo confirma recursos al completar el flujo.

## Pantalla de combate

- La superficie ocupa el viewport completo, usa el lenguaje visual neutral/ámbar del DM Screen y no se muestra como popup flotante.
- El encabezado no arrastra ni redimensiona la pantalla. Solo contiene la traduccion; la salida se hace desde **Player sheet**, la barra lateral o Escape. La geometria se guarda en `localStorage` bajo `dnd-character-sheet-combat-board-v1`.
- Mientras la pantalla está activa se bloquea el scroll de la planilla. **Player sheet** cierra combate y devuelve la vista a la hoja.
- Al elegir una acción, la pantalla entra en modo de resolución enfocado: oculta temporalmente el catálogo, muestra los pasos numerados con estados actual/pending/completo y vuelve al catálogo al confirmar o cancelar.

La superficie sigue la distribucion del tablero de combate. El panel lateral izquierdo agrupa las esferas de economia y los recursos; los separadores verticales redimensionan ese panel, el mapa y el registro; el separador horizontal redimensiona el dock de acciones, empujando las otras cajas y respetando anchos/alturas minimos. El texto usa columnas flexibles, wrapping y scroll interno para adaptarse al espacio.

La superficie sigue la distribucion del tablero de combate: izquierda para economia y recursos, centro para el mapa VTT y derecha para los controles de descanso y el registro. Las acciones quedan en un dock inferior para conservar el flujo actual sin tapar el mapa. Al conectarse al DM, `renderer.js` abre automaticamente Combate y portaliza la ventana VTT existente al `#combatMapViewport`; el mapa nunca se muestra como ventana flotante sobre la hoja. Al volver a **Player sheet**, el VTT queda oculto y reaparece solo al abrir **Combat** nuevamente. Si no hay conexion o mapa activo, el centro muestra un estado vacio y la iniciativa no inventa datos privados del DM.

El catalogo inferior se divide en tabs por categoria (`Attacks`, `Spells`, `Actions`, `Bonus Actions`, `Movement`, `Reactions`, `Items` y `Features`). Solo el panel activo ocupa espacio visible, pero los paneles ocultos siguen en el DOM para conservar la traduccion masiva y los mismos handlers de resolucion.

La resolucion paso a paso usa un encabezado compacto, un stepper horizontal con estados pendiente/actual/completo y tarjetas separadas para detalles, tiradas y resultado. El contenido tiene scroll interno, los controles mantienen el tema oscuro/ambar y la altura minima del dock evita que el pie de confirmacion quede comprimido al abrir una accion.

El panel izquierdo mantiene fijo el texto de Movement y centra solo su ovalo de economia. El panel derecho ofrece `Long rest` y `Short rest` mediante los mismos handlers y el mismo estado de descanso de la hoja; debajo conserva el Combat Log. Active statuses reutiliza las tarjetas y acciones de Character Statuses: cada estado tiene `x` para quitarlo y el boton `+` abre el mismo picker flotante de la sheet para agregarlo. El launcher `+` se retira de la sheet para evitar dos rutas distintas; la ventana compartida se abre desde combate. Los controles persistentes del encabezado permiten ocultar/mostrar Resources, Combat Log y Actions; al ocultarlos, el mapa VTT conserva su track visible y ocupa el espacio liberado con una transicion breve. El VTT portalizado conserva Raise hand y muestra la cola compacta en una tarjeta overlay abajo a la derecha, sin reservar una barra superior.

## Movimiento medido en el VTT

- El diámetro default del token (`56` unidades base del mapa) es la regla maestra y equivale a `5 ft`. La distancia siempre se calcula desde el centro inicial hasta el centro final; agrandar visualmente un token no cambia la escala.
- Fuera de combate se conserva el drag libre existente. Cuando al menos un grupo está marcado en combate, el DM hace click en una ficha para seleccionarla y luego click en el destino; el drag directo y el drag desde el tracker quedan deshabilitados.
- Sólo se desplaza el combatiente activo. `src/engine/combat/vtt-movement.js` toma el Speed de la nota enlazada (`Speed` del jugador o `speed.walk`/speed del monstruo), resta lo ya recorrido en ese turno y recorta linealmente el destino si no alcanza. `Siguiente` reinicia el presupuesto del nuevo turno.
- La animación publica posiciones intermedias por el mismo `dm:vtt:patch` del drag existente, por lo que DM y jugadores ven el deslizamiento. Una forma adjunta acompaña a la ficha.
- Cada forma geométrica muestra cotas horizontal y vertical punteadas en pies, calculadas con la misma regla maestra, tanto en el DM Screen como en el VTT del jugador. El menú contextual permite escribir `Ancho (ft)` y `Alto (ft)` directamente; por ejemplo, `5` y `5` producen una forma de 5×5 ft.

## Entradas y fuentes de verdad

| Responsabilidad | Fuente |
| --- | --- |
| Registro de proveedores | `src/engine/actions/action-advisor.js` y `registerTurnActionProviders()` |
| Economía/Extra Attack | `src/engine/combat/turn-economy.js`, persistido en `__sheetMeta.combatTurn` |
| Pipeline y rollback | `src/engine/combat/resolution-engine.js` |
| Acciones universales/perfiles | `src/engine/combat/action-definitions.js` |
| Tiradas reales | `rollD20WithMode()`, `rollDiceExpression()`, `summarizeD20Roll()` y `showDiceTray()` en `index.html` |
| Armas/inventario | campo PDF `Equipment`, `__sheetMeta.equippedItems`, catálogo app-owned `src/data/items/items.json` y `weaponAttackSelection()` |
| Capacidades de ítems | `src/data/items/item-automation.json`, `src/engine/items` y `src/engine/effects`; adaptadores `itemCapabilityTurnActions()`/`processActiveItemEffectEvent()` |
| Hechizos | `src/data/spells/spells.json`, `src/engine/spells/spell-data.js`, campos/checkboxes del PDF, `spellAttackSelections()` y `castPreparedSpell()` |
| Features/raza/clase/subclase/feats | entradas generadas del renderer y registros vendor; `featureActionItemsFromEntries()` |
| Condiciones | `__sheetMeta.activeStatuses` y `src/engine/conditions/statuses.js` |
| Slots/usos/pools | helpers existentes del renderer y `src/engine/resources` |
| Registro | `__sheetMeta.combatLog` con respaldo local `dnd-character-sheet-combat-log-v1` |
| Selector de objetivos | `globalThis.dndLiveVttCombatTargetRoster()` en `renderer.js`, consumido por `index.html`; durante un combate VTT usa exactamente los participantes visibles del tracker y publica solo nombres |
| Movimiento VTT | `src/engine/combat/vtt-movement.js` para escala/Speed/límite; interacción, animación y persistencia de `combatState.movement*` en `dm-screen/src/main.jsx` |

## Flujo

1. `combatTurnState()` crea o migra el turno con Action, Bonus Action, Reaction, Movement, Object Interaction y ataques máximos.
2. Una tarjeta declarativa se valida y `createCombatResolution()` reserva el coste. El contador proyectado cambia mientras la sesión está abierta.
3. El stepper solicita sólo los pasos declarados: target, attack roll, save/check, damage/healing, efecto y confirmación. El target es un selector: sin combate VTT activo conserva el propio personaje como opción; con combate VTT activo usa exactamente la misma lista visible de `combat.participants` que el tracker superior, sin añadir tokens del mapa fuera de combate ni al jugador si no pertenece a esa lista. No acepta texto libre ni pide AC; los resultados Hit/Miss no determinados por natural 1/20 se confirman con el DM.
4. Un ataque no habilita Damage hasta tener Hit; natural 1 falla, natural 20 marca crítico y duplica dados, no modificadores fijos. `damageComponents` mantiene fórmula/tipo/fuente por separado y `results.damageRolls` sus subtotales; los campos singulares siguen como compatibilidad.
5. Los saves y el daño automático no crean Hit Roll. Si el modificador/AC del target es privado, el jugador marca el resultado comunicado por el DM.
6. `Confirm Result` consume la economía y después usa los adaptadores existentes de slots, usos, inventario, munición, estados y log. `Cancel` revierte la reserva.
7. `End Turn` deja la Reaction restante disponible para tarjetas `allowOutsideTurn`; `New Turn` la restaura y elimina Dodge/Ready vencidos.

## Cobertura actual

- Acciones universales 2024, armas equipadas, Unarmed Strike, ataques otorgados por features, Grapple/Shove e Improvised Action. Las tarjetas de armas muestran sólo daño/tipo y rango; el detalle completo permanece en Equipment.
- Hechizos preparados/conocidos clasificados desde metadata estructurada por casting time, Attack Roll, Saving Throw, daño, healing, temporary HP o utility. Conserva variantes source-aware, escala/upcasting, uso gratis y slots existentes.
- Extra Attack, offhand/Bonus Action, Opportunity Attack, Readied Action, consumibles, ammo explícita, Sneak Attack una vez por turno, Action Surge y Concentration replacement.
- Movimiento manual normal/difficult/crawl/climb/swim/jump y Stand Up/Drop Prone.

## Rendimiento y caché

- `renderer.js` construye índices una vez al recibir `items.json.item`. `findItemData()` debe preferir la referencia estable `catalogId` y resolver por `Map`; el fallback legado por nombre no debe convertir tombstones ni `itemGroup` en opciones activas, ni promover variantes anidadas a filas superiores. Las variantes específicas sólo se ofrecen desde su padre.
- `collectCurrentTurnActions()` conserva una fotografía por `combatActionCacheRevision`; dentro de una pasada, `combatMemoValue()` comparte entradas de equipo, spells, features, feats, estados y Extra Attack.
- `updateDerivedStats()`, cambios de campos, recursos, estados, inicio/fin de turno y commits invalidan la fotografía. Equipment evita el pipeline global: `scheduleEquipmentMutationRefresh()` agrupa lista, AC, ataques preparados, alertas y combate después del siguiente paint; `notifyEquipmentCombatStateChanged()` delega en esa transacción.
- Los refrescos derivados se agrupan con `scheduleTurnActionsPanelRefresh()`/`requestAnimationFrame`. Confirmar una acción actualiza solo paneles afectados y no ejecuta el pipeline global de stats.
- `globalThis.dndCombatPerformance.samples()` expone las últimas muestras `collect`/`render` para diagnóstico desde DevTools; no se persisten.
- `globalThis.dndEquipmentPerformance.samples()` expone hasta 40 transacciones de Equipment con motivos, espera de cola y duración; `clear()` reinicia la muestra y nada se persiste.
- El primer acceso espera `itemCatalogReadyPromise` solo si la carga de fondo aún no terminó y muestra un estado explícito.

## Perfil y resolución de spells

- `src/engine/spells/spell-data.js` expone `spellBehaviorProfile()`: ataques, saves, tipos de daño, condiciones, área, concentración, ritual, materiales, healing, temporary HP y presencia de escala. Es clasificación pura y no aplica efectos por sí sola.
- Las tarjetas y el stepper deben reutilizar los adaptadores existentes de tiradas, daño/healing, slots/recursos, Concentration, estados y combat log. No crear un pipeline paralelo ni un handler vacío por cada entrada del catálogo.
- Las referencias de hoja distinguen variantes por id/source/level, pero mantienen fallback por nombre/nivel para saves antiguos. Una acción nueva debe conservar esa identidad hasta resolver el registro del catálogo.
- Una regla es automática solo cuando el flujo existente puede resolverla de forma determinista. El resto se presenta como guía para confirmación del jugador/DM; estar en `spells.json` o tener un perfil no equivale a automatización completa.
- Las tiradas de Temporary HP solo escriben en el campo del caster cuando `directSelfTemporaryHitPointsExpression()` identifica una concesión propia, inmediata e inequívoca. Efectos dirigidos, condicionales, por elección o derivados del daño conservan su metadata y texto, pero requieren adjudicación; nunca se reutiliza una tirada de daño como Temporary HP.
- Healing fijo o manual no añade un paso de tirada vacío. Los riders `AAD` persistentes (Hex, Hunter's Mark, Divine Favor y equivalentes) no tiran daño al castear: `recordSuccessfulSpellCast()` los guarda en `__sheetMeta.activeSpellAttackEffects`, y `combatOptionalDamageChoices()` los ofrece en ataques posteriores con el mismo pipeline de daño. Terminar Concentration elimina sus riders, los efectos temporales envejecen por turno y un Long Rest completado los limpia.
- Booming Blade, Green-Flame Blade y True Strike se detectan mediante `spellHasEmbeddedWeaponAttack()`. `spellAttackSelections()` genera una opción por arma equipada compatible, reutiliza bonus/dado/modificadores del arma y suma sólo el escalado inmediato "on hit"; el daño secundario por movimiento/segundo target permanece guiado por el texto canónico.
- En spells con varios saves, el stepper usa como save inicial el primero que aparece realmente en el texto y conserva la lista estructurada completa. Cuando los saves pertenecen a modos mutuamente excluyentes (Bigby's Hand, Nathair's Mischief y similares), la selección de modo y sus pasos alternativos siguen siendo adjudicación guiada.

## Límites deliberados

- No hay aplicación automática de HP a enemigos ni lectura de AC/resistencias/saves privados. El log emite una propuesta para el DM.
- Range, línea de visión, terreno del mapa, targets de área y velocidades especiales todavía requieren validación manual; climb/swim usan coste 2x salvo adjudicación.
- Materiales costosos/consumibles se muestran desde metadata cuando existe, pero no hay un ledger estructurado de componentes en el inventario.
- El panel Prepared Spells ofrece el cast ritual explícito para registros rituales de nivel 1+ y no consume slot. No modela los diez minutos adicionales, requisitos de ritual-casting de cada clase ni posesión/consumo de materiales; esas comprobaciones siguen siendo manuales.
- Un cast directo que reemplaza Concentration exige dos pulsaciones dentro de diez segundos y realiza esa comprobación antes de interrumpir un descanso o gastar recursos. El stepper de combate conserva su confirmación explícita y transmite esa decisión al commit del spell. El contador `CON` de Prepared Spells permite terminarla manualmente; completar un Long Rest también la termina, pero iniciar o interrumpir el descanso no.
- El lifecycle de ítems soporta dispatch genérico de triggers y el Censer usa `sourceTurnStart`; reglas no declaradas, summons/transformaciones y maniobras abiertas no generan prompts automáticos.
- Los riders opcionales exponen fórmula y tipo, pero el jugador/DM confirma target, alcance y trigger. Buffs con cargas o targets compartidos (por ejemplo Flame Arrows o Crusader's Mantle) no mantienen un ledger autoritativo por criatura.
- Que un item sincronizado declare cargas, saves, spells, resistencias o acciones no implica que el motor pueda ejecutarlos sin contexto. Sólo se automatizan perfiles deterministas soportados por inventario/equipo/recursos/condiciones; targets, geometría, efectos de mundo y elecciones abiertas permanecen guiados y visibles en el detalle.
- Live Sheet sólo reenvía las tiradas confirmadas. Falta el protocolo autoritativo host/DM para validar y aplicar economía, HP y efectos compartidos.
- Las áreas de ítems usan selección guiada de criaturas. La hoja puede aplicar HP propio y registrar objetivos, pero todavía no calcula posiciones/radios desde tokens ni aplica HP remoto; `movesWithAnchor`/visibilidad quedan preparados para esa integración.

## Prueba manual

Ademas de las acciones, verificar en una sesion conectada al DM que la conexion abre automaticamente Combate, que el mapa VTT aparece solo en su panel central, que la iniciativa publica y el combatiente activo se actualizan con los parches recibidos, y que **Player sheet** oculta el VTT sin crear una ventana sobre la hoja.

1. Abrir una hoja con el arma A equipada y pulsar **Combat** en la barra lateral. Confirmar que la pantalla ocupa el viewport completo y que su tarjeta sólo muestra daño/tipo y rango. Desequipar A y equipar el arma B; confirmar que las acciones cambian inmediatamente. Pulsar **Player sheet**, volver a **Combat** y confirmar que muestra B. Verificar además los cinco recursos, `End Turn` y los separadores ajustables.
2. Preparar Booming Blade, Green-Flame Blade o True Strike con un arma compatible equipada. Confirmar que aparece una acción por arma, que el ataque usa el bonus correcto y que el daño combina el arma con el dado "on hit" del nivel actual sin tirar el rider secundario.
3. Lanzar Hex o Hunter's Mark, confirmar el cast sin damage roll y abrir un ataque posterior: el rider debe aparecer como daño opcional. Terminar Concentration y confirmar que desaparece. Repetir con Zephyr Strike y comprobar que su rider de un uso se consume al confirmarlo.
4. Abrir un arma, elegir target en el dropdown y confirmar que no existe campo de AC. Conectar un jugador a un VTT en combate y comprobar que el dropdown contiene exactamente los mismos nombres visibles que el tracker superior; retirar un token del grupo de combate y verificar que desaparece de ambos. Tirar Hit, resolver Hit/Miss con el DM y verificar que Damage estaba bloqueado antes. Confirmar además que el catálogo de acciones queda oculto durante la resolución y vuelve al cancelar. Probar natural 1/20 cuando sea posible.
5. En un Fighter con Extra Attack, confirmar dos ataques: la primera confirmación consume Action y la segunda no.
6. Probar un spell attack, un spell con save (por ejemplo Fireball/Sacred Flame), Magic Missile, un healing spell y uno con temporary HP. Confirmar que casting time, save/attack y escala provienen del registro correcto; cancelar antes de confirmar y comprobar el slot.
7. Gastar Bonus Action y Reaction; terminar el turno y comprobar que una Reaction `allowOutsideTurn` sigue disponible.
8. En el VTT del DM, marcar un grupo en combate, seleccionar el token activo y hacer click a 10 ft: confirmar el descuento centro a centro y el deslizamiento en DM/jugador. Después marcar un punto más lejano que el Speed restante y confirmar que se detiene a mitad de camino. Pasar turno y verificar el reinicio. Confirmar además que drag directo/tracker no reposicionan fichas durante combate y que fuera de combate el drag sigue funcionando.
9. Crear/redimensionar un círculo, cuadrado y cono; confirmar cotas punteadas horizontal/vertical en DM y jugador, con `56` unidades equivalentes a `5 ft`. En el menú de una forma escribir `5` en ancho y alto, salir del campo y confirmar que queda en 5×5 ft sin superponer las etiquetas.
10. Probar Movement, Difficult Terrain, Stand Up, Drop Prone, Dash, un consumible y un arma con ammo registrada.
11. Guardar/cambiar de slot/volver. Confirmar que turno y combat log corresponden al slot.

Validación automática: `npm run test:items`, `node scripts/validate-spells.js`, `node tests/engine/combat.test.js`, `node tests/engine/vtt-movement.test.js`, `node tests/renderer/vtt-combat-movement.test.js`, `node tests/renderer/combat-ui.test.js`, `node tests/renderer/combat-performance.test.js`, `node tests/renderer/combat-equipment-refresh.test.js`, `node tests/services/data-loader-cache.test.js`, `npm test` y `git diff --check`.

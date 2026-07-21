# Pruebas

## Estrategia actual

Las pruebas son scripts Node con `assert`, sin runner externo. Cubren módulos puros, diagnósticos de datos, persistencia, networking WebSocket, validación de paths de Obsidian e i18n. No existe cobertura instrumentada, test de UI end-to-end, lint ni typecheck.

| Capa | Comando | Qué valida |
| --- | --- | --- |
| Completa | `npm test` | i18n, catálogo de items, engine, services y renderer |
| i18n | `npm run test:i18n` | paridad EN/ES, placeholders y advertencias hardcoded |
| Catálogo de items | `npm run test:items` | 1.779 activos, identidad, overlay/schema/registry, recursos/efectos declarativos, preview/apply/check/restore e idempotencia |
| Catálogo de spells | `npm run test:spells`; `node tests/renderer/spell-integration.test.js` | schema, digest/conteo canónico, round trip, campos derivados, IDs e identidades, tags/texto, perfiles, escala, materiales, iconos e integración de ambos renderers |
| Engine | `npm run test:engine` | backgrounds, registries, resources/rest, mecánicas de clase nivel 3 y motor de combate |
| Services | `npm run test:services` | saves, Obsidian, protocolo Live Sheet (incluidos patches de status) y caché/worker de catálogo |
| Renderer | `npm run test:renderer` | i18n, contratos del combat UI/rendimiento y regresiones del DM renderer |
| DM build | `npm run build:dm-screen` | transformación Vite/Tailwind y assets importados |

El test de saves usa `.test-tmp/save-service`, nunca datos reales del usuario. Los tests existentes de Obsidian/backgrounds usan directorios temporales descartables.

El test puro de descansos valida la transición 2024, gasto determinista de Hit Dice, recuperación por `recharge`, Warlock Pact Magic, Exhaustion, interrupciones, migración idempotente y preservación de recursos desconocidos.

`scripts/validate-items.js` exige 1.779 elementos activos, identidades reproducibles, tombstones separados y un overlay resoluble. `tests/engine/item-automation.test.js` cubre schema/registry, Devotee's Censer, Belt of Dwarvenkind, Balance Card, Cape of the Mountebank, Medal of Muscle, daño por componentes, DC fijo, spells de item, modifiers persistentes, status de item por habilidad, transacción, dawn distinto de Long Rest, ciclo de vida, serialización y migración legacy. `item-resource-state.test.js` cubre pools implícitos/nombrados y recovery. `tests/renderer/item-automation-integration.test.js` protege loader, registry, acciones, riders, modifiers, spells/acciones de item en ambas superficies, selección guiada, gasto persistente `oneTime`, activación de status y ausencia de condicional por nombre. Los contratos estáticos complementan, pero no sustituyen, un smoke DOM/Electron. Las pruebas existentes mantienen cobertura de catálogo, sync e integración de Equipment.
La integracion del catalogo tambien exige que el picker React del DM conserve la descripcion propia, incorpore reglas heredadas y muestre miembros de grupos, con un mensaje explicito solo cuando el registro no aporta texto adicional.

`tests/engine/item-data.test.js` fija los registros de `Simic Guild Signet` y `Bell Branch` como attached spells canónicos de una carga; `tests/renderer/item-resource-integration.test.js` verifica que los attached spells reutilicen la definición canónica, no gasten slots, preserven el nombre de la spell sin sufijos de item, apliquen pools declarados, exijan attunement/equipo al confirmar y salgan de Attacks & Spellcasting cuando el recurso se agota.

Cuando estén disponibles los mismos artefactos canónicos, ejecutar dos veces sin escritura:

```powershell
npm run sync:items -- --source <items-sublist-data.json> --reference <items-sublist.md> --check
npm run sync:items -- --source <items-sublist-data.json> --reference <items-sublist.md> --check
```

Ambas pasadas deben reportar cero cambios. Los 1.779 son registros superiores de `item`: `tombstone` e `itemGroup` son metadata/historial no seleccionable. Los `variants[].specificVariant` tienen identidad activa propia y se seleccionan desde su padre, pero no se suman como filas superiores.

`scripts/validate-spells.js` valida el catálogo versionado contra `src/data/spells/spell.schema.json` sin necesitar los archivos externos de importación. Reconstruye el digest, conteos y campos derivados, comprueba que cada identidad nombre+fuente+nivel y cada `id` sean únicos, detecta tags 5etools sin resolver y valida iconos/fallbacks. `tests/engine/spell-data.test.js` recorre los 834 registros, prueba el round trip canónico/legacy y fija regresiones representativas de tags, escala, materiales, perfiles y variantes repetidas. `tests/renderer/spell-integration.test.js` fija identidad fuente-aware, serialización, rituales, concentración, Temp HP, ausencia de daño/ataques falsos y consumo del módulo compartido por Character Sheet y DM Screen. Las clases canónicas sin implementación local se reportan como warning, y los nombres duplicados legítimos se conservan cuando difieren en fuente o nivel. `npm test` ejecuta estas pruebas mediante `test:engine` y `test:renderer`; `npm run test:spells` ofrece la pasada rápida de catálogo.

Cuando estén disponibles los mismos artefactos usados para importar, verificar además la reproducción sin escrituras:

```powershell
node scripts/sync-spells.js --source <canonical-spells.json> --reference <spell-reference.md> --check
```

`tests/engine/combat.test.js` cubre economía, Extra Attack, Hit → Damage, componentes tipados/compatibilidad legacy, saves, reacciones, transacción, recursos, Concentration y log con subtotales. `tests/renderer/combat-ui.test.js` protege el shell/stepper y `item-automation-integration.test.js` el wiring declarativo.

`tests/engine/class-level3-mechanics.test.js` verifica también Weapon Mastery del Fighter 2024: tres elecciones iniciales en nivel 1, progresión 3/4/5/6, un solo reemplazo mediante Weapon Drills por Long Rest, instantánea al iniciar y restauración si el descanso se interrumpe.

`tests/renderer/combat-performance.test.js` protege índice/memoización y el worker de PDF; `combat-equipment-refresh.test.js` protege la transacción diferida de Equipment, el refresco de defensas y la aplicación/restauración de pisos de ability score. `item-data.test.js` distingue efectos persistentes vestidos de consumibles temporales. Las pruebas visuales protegen picker, controles, ventanas y VTT. `tests/services/data-loader-cache.test.js` usa JSON temporales para comprobar caché persistente v3 e invalidación por catálogo, metadata u overlay; no toca `userData` real. `dm-screen-build-cache.test.js` protege por separado los inputs/chunks Vite.

`tests/renderer/spell-picker-performance.test.js` protege el snapshot único por apertura del administrador de spells: grants de feats/subclase, sets, conteos, límites y opciones accesibles deben reutilizarse en las filas. También exige las mediciones Performance API `spell-picker-open` y `spell-picker-level-render`.

`tests/renderer/choice-response-performance.test.js` protege la respuesta inmediata de Features & Traits y selectores relacionados: las elecciones deben agrupar `updateDerivedStats()` después del primer pintado, reutilizar un solo snapshot liviano al validar spells, actualizar las filas de spells de forma optimista y diferir el render de Equipment/Prepared Spells cuando sus paneles están fuera del viewport.

`tests/renderer/status-popup.test.js` protege el popup temporal inferior derecho: mantiene el contrato fade, permanece visible cinco segundos y conserva el tamaño ampliado con límite responsive dentro del viewport.

## Smoke test manual mínimo

1. `npm start`; confirmar que abre la Character Sheet sin error.
2. Crear/cargar una hoja, guardar, cambiar slot, volver y limpiar solo el slot activo.
3. Cambiar EN/ES y comprobar texto/valores persistidos.
4. Abrir DM Screen; comprobar que tablero y bibliotecas cargan.
5. Iniciar Live Sheet con token, conectar a `127.0.0.1`, modificar HP, tirar, agregar/quitar un Status desde la nota del jugador en el DM Screen y confirmar que se refleja en la hoja conectada antes de desconectar.
6. Añadir/mover/redimensionar una nota/mapa y reiniciar para verificar persistencia.
7. Si se tocó Obsidian, usar un vault de prueba y verificar lectura, escritura y rechazo de `../`.
8. Si se tocó VTT/audio, verificar límites, estado compartido y que contenido oculto no llegue al jugador. Para enlaces YouTube, guardar un enlace válido, renombrarlo, cerrar/abrir el DM Screen y confirmar que persiste aunque IndexedDB no esté disponible; al pulsar Play debe abrirse una nota YouTube visible, móvil y redimensionable. Confirmar que no aparece `Error 153`, que el tiempo del video avanza, y que pausa/reanudación funcionan tanto en esa nota como en el reproductor compacto visible de un jugador Live Sheet; un ID inválido debe rechazarse.
9. Si se tocó combate, seguir además `docs/COMBAT.md`: Hit/Miss/crit, spell save, Magic Missile, cancelación, Extra Attack, End Turn y Reaction fuera de turno.
10. Si se tocaron spells, comprobar búsqueda/filtros, disponibilidad de clase/raza, selección, known/prepared, detalle estructurado, guardado/carga y al menos un attack, save, concentración, ritual sin gasto de slot, material, escala y efecto guiado/manual. Probar además un ataque de arma embebido (Booming Blade/Green-Flame Blade/True Strike) y un rider `AAD` persistente y posterior (Hex/Hunter's Mark), incluida su limpieza. Incluir dos variantes con el mismo nombre cuando corresponda y confirmar que el save recupera la fuente/nivel correctos. Abrir también la biblioteca del DM Screen y verificar búsqueda/metadatos; reconstruirla con `npm run build:dm-screen` si cambió su código.
11. Si se tocaron items, confirmar 1.779 entradas activas en ambos pickers, buscar una variante hija por nombre, abrir arma/armadura/cargas/attunement/spell/consumible/veneno/variante, añadir y recargar inventario, y comprobar el comportamiento genérico disponible. Probar CA persistente segura, saves/ataque/CD de conjuros, defensas visibles, sintonización determinista y manual, una Wand con casting time propio, Potion con Bonus Action, pack de munición nuevo, munición mágica compatible y activación/desactivación persistente de un efecto guiado. En un item con cargas numéricas, gastar/recuperar hasta ambos límites, guardar/cargar y confirmar que un spell con costo declarado descuenta sólo al confirmar combate; cancelar no debe descontar. Para una capability `oneTime` que activa status, cancelar no debe gastarla; confirmar debe añadir el status, hacerlo visible/removible en la hoja y DM Screen, aplicar sus tiradas específicas, y separar sólo esa unidad en Equipment como `Used`/`Usada`. Añadir una segunda copia del mismo ítem y verificar que sigue ofreciendo su acción; la copia usada debe persistir después de guardar/cargar aunque el status se retire. En recargas con dados y usos `daily`/`rest`/`will`, verificar que la expresión y costo se muestran pero el ajuste permanece manual. Dos copias del mismo `catalogId` comparten contador por ahora y los packs legacy no se migran. Crear una referencia oficial, retirarla sólo en un fixture/entorno aislado y verificar que ya no es seleccionable pero abre como snapshot unavailable; confirmar que un homebrew homónimo no cambia.
12. Si se toco el picker de Items del DM, seleccionar una entrada con `entries` propios, un arma o armadura con reglas heredadas y un grupo; cada caso debe mostrar texto en el panel derecho, sin abrir otra ventana.
13. Si se tocaron items homebrew, crear uno en el DM, entregarlo a uno y a varios jugadores, comprobar cantidad, descripcion y propiedades en el inventario, y confirmar persistencia tras guardar, recargar y reconectar Live Sheet.

Usar además las listas específicas en `docs/feature-map.md`, `docs/manual-testing-mercantile.md` y `docs/live-sheet-tailscale.md` cuando corresponda.

## Antes de integrar

```powershell
node scripts/validate-items.js
node tests/engine/item-data.test.js
node tests/engine/item-resource-state.test.js
node tests/renderer/item-catalog-integration.test.js
node tests/renderer/item-resource-integration.test.js
node tests/services/item-sync.test.js
node scripts/validate-spells.js
node tests/engine/spell-data.test.js
node tests/renderer/spell-integration.test.js
npm test
npm run build:dm-screen
git diff --check
git status --short
```

Revisar el diff por outputs inesperados, secrets, cambios de lockfile, datos vendorizados y bundles generados. El build completo de Electron y el arranque interactivo deben reportarse como no verificados si no se ejecutaron realmente.

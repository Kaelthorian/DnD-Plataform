# Sincronización del catálogo de ítems

La fuente de runtime es `src/data/items/items.json`. El array superior `item` contiene exclusivamente el catálogo oficial activo; `tombstone` conserva identidades compactas de registros retirados para resolver referencias históricas, pero nunca forma parte de los selectores. `src/data/items/items-base.json` contiene sólo metadatos compartidos (`itemProperty`, `itemType`, `itemMastery` y grupos auxiliares), no un segundo array activo de `baseitem`.

Los archivos externos de importación son artefactos revisados, no dependencias de runtime. El JSON manda sobre el Markdown; el Markdown sólo sirve como referencia auditable. El snapshot bajo `vendor/5etools-src-main/data` se conserva intacto como baseline/recuperación de desarrollo y ya no se empaqueta como catálogo activo.

## Identidad y conteo

- `catalogId` es la identidad persistente y se deriva de nombre, fuente y token de variante normalizados. No se debe buscar, reemplazar ni deduplicar únicamente por el nombre visible.
- `catalogKey` conserva la clave auditable de identidad y `catalogVariantToken` distingue variantes que comparten nombre o procedencia.
- Las variantes superiores son registros independientes cuando la fuente las declara así. Cada `variants[].specificVariant` también recibe una identidad estable y puede seleccionarse desde el detalle de su entrada genérica, pero no se convierte en otra fila superior ni aumenta el conteo de 1.779.
- El resultado esperado de esta importación es exactamente 1.779 elementos en `item`. Un tombstone no es un elemento activo.
- Esta entrega contiene además 2.431 variantes hijas (4.210 identidades activas direccionables) y conserva 9.234 tombstones del baseline. Los cinco nombres visibles repetidos abarcan 12 filas y son intencionales por fuente: Musical Instrument, Trinket, Cloak of Billowing, Dread Helm y Prosthetic Limb.
- El mismo input debe producir el mismo JSON, orden, identidades y hashes. Una segunda ejecución en modo `--check` debe reportar cero cambios.

## Flujo seguro: preview, apply y check

Usar siempre las dos entradas revisadas de la misma entrega:

```powershell
npm run sync:items -- --source <items-sublist-data.json> --reference <items-sublist.md>
```

Ese comando es dry-run por defecto: calcula altas, reemplazos y bajas y escribe `src/data/items/sync-preview.json`, sin cambiar el catálogo. Revisar los conteos y las listas por `catalogId`; una baja significa que deja de estar seleccionable, no que se borren hojas, inventarios o historiales.

Aplicar sólo después de revisar el preview:

```powershell
npm run sync:items:apply -- --source <items-sublist-data.json> --reference <items-sublist.md>
```

El apply escribe el catálogo app-owned, crea un backup gzip content-addressed bajo `src/data/items/backups/` y actualiza `src/data/items/items-backup.manifest.json` con rutas relativas y SHA-256 pre/post. El manifiesto v2 es portable: si se mueve junto con su directorio de backups, la restauración resuelve los payloads desde su nueva ubicación y siempre escribe en los targets actuales indicados por CLI, no en rutas absolutas antiguas. Los manifiestos v1 siguen siendo aceptados. El apply no modifica los archivos externos ni el snapshot vendor. El preview inicial se conserva como evidencia y no se reemplaza silenciosamente durante el apply. Preview, backups y manifiesto son artefactos de desarrollo excluidos del paquete Electron.

Comprobar reproducibilidad e idempotencia con los mismos artefactos:

```powershell
npm run sync:items -- --source <items-sublist-data.json> --reference <items-sublist.md> --check
npm run sync:items -- --source <items-sublist-data.json> --reference <items-sublist.md> --check
npm run test:items
```

`--check` no escribe archivos y falla si el resultado calculado difiere del catálogo versionado. Las opciones `--catalog`, `--base-catalog`, `--preview`, `--backup-dir` y `--backup-manifest` existen para pruebas aisladas; no deben apuntar a datos de usuario ni usarse para crear una segunda fuente de runtime.

## Recuperación

Para restaurar el preestado registrado por un manifiesto:

```powershell
node scripts/sync-items.js --restore-backup src/data/items/items-backup.manifest.json
```

La restauración valida ambos payloads y sus hashes antes de escribir, rechaza un target cambiado después del apply y evita usar las rutas de salida antiguas del manifiesto. Después se debe ejecutar `npm run validate:items`, `npm run test:items` y reconstruir el DM Screen. El backup es una salvaguarda de desarrollo del catálogo; no sustituye los backups de hojas de personaje y no debe copiarse sobre el store de saves.

## Historial y homebrew

- Los pickers de Character Sheet y DM Screen muestran sólo las 1.779 filas de `item`. Desde una fila genérica pueden resolver y seleccionar sus `variants[].specificVariant` por identidad propia; `tombstone` e `itemGroup` nunca son opciones nuevas.
- Equipment nuevo conserva nombre, fuente y token de variante para reconstruir la identidad estable; las notas oficiales del DM conservan `catalogId` y snapshot. Los saves antiguos sólo por nombre mantienen el criterio histórico de preferir fuentes modernas (`XPHB`/`XDMG`) cuando existe más de una coincidencia; no usar ese fallback para nuevas escrituras porque un nombre por sí solo no identifica todas las variantes.
- Una referencia ya guardada a un ítem retirado conserva su snapshot o se resuelve contra su tombstone y se muestra como no disponible. No puede añadirse a un personaje nuevo.
- Personajes, slots, inventarios, cantidades, cargas, historial de uso y combat log no se eliminan durante la sincronización.
- El homebrew del usuario permanece en su almacenamiento/ruta separada. No se transforma en registro oficial, no recibe tombstone y no entra en los conteos de sincronización.

### Entrega de homebrew a jugadores

Los ítems creados desde `src/app/renderer/dm-screen/src/main.jsx` se guardan como notas del tablero con `entryCustom`. Una nota de ítem homebrew muestra el botón `Dar`, que permite seleccionar uno o varios jugadores conectados y una cantidad. La entrega reutiliza `live-sheet:update-player-sheet` y escribe dos piezas coordinadas:

- una línea estable en el campo `Equipment`, con la referencia `[fuente|homebrew:<id>]`;
- el snapshot completo en `__sheetMeta.homebrewItems`, incluyendo descripción, tipo, rareza, propiedades y valor/peso.

El Character Sheet resuelve esa referencia desde `__sheetMeta.homebrewItems`; al hacer clic en la fila se abre el mismo drawer de ítems y se conserva la descripción/funcionalidad textual después de guardar, recargar o reconectar Live Sheet. Los textos libres del homebrew se muestran como reglas y recordatorios, pero no se convierten automáticamente en tiradas o efectos deterministas: para automatización estructurada debe existir un perfil compatible en el catálogo/overlay oficial.

## Runtime y automatización

`src/services/data-loader.js` carga los dos JSON canónicos y el overlay `item-automation.json` mediante el worker y una caché binaria derivada v3. La firma incluye tamaño/mtime de los tres archivos y versión del schema. El Character Sheet mantiene el índice/registry en memoria; el DM Screen importa la colección canónica. Cambiar cualquier fuente invalida la caché derivada.

La sincronización conserva campos estructurados, descripciones, reglas heredadas de `itemType` y tags; no convierte automáticamente cada frase de reglas en una mutación de personaje. `item-catalog.js` deriva perfiles reutilizables y `item-resource-state.js` persiste cargas/reload numéricos por `catalogId`, con límites y gasto confirmado.

Los adaptadores genéricos cubren armas, armaduras, múltiples accesorios/wondrous equipables, munición base/mágica compatible, expansión de packs nuevos, consumibles, conjuros anexos con su propio casting time y costes explícitos, CA persistente segura al llevar/sostener, saving throws y bonos persistentes de ataque/CD de conjuros. Las referencias estructuradas de properties/masteries conservan `uid`/`note`, y ambos renderers muestran las reglas heredadas por `_copy` de `itemType`. Una lista de spells sólo se convierte en acciones cuando el ítem concede expresamente castearlos; no se interpreta el contenido de un spellbook como poderes del ítem. Las defensas equipadas se agregan al resumen visible, pero no modifican automáticamente daño/HP. Los requisitos deterministas de sintonización por clase, raza, background o capacidad de lanzar conjuros se validan; requisitos narrativos o no representados en la hoja requieren confirmación manual y todavía no se impone el límite global de tres ítems sintonizados.

Las capacidades deterministas se declaran en el overlay separado y se validan por identidad exacta; consultar `docs/ITEM_AUTOMATION.md`. Recursos nombrados usan `catalogId::resourceId`, daño adicional conserva componentes/tipos y efectos nuevos crean instancias en `__sheetMeta.activeItemEffects`. `itemEffects` continúa como marca manual legacy. Recargas con dados, decisiones abiertas y geometría VTT permanecen guiadas. Los packs de munición legacy no se migran retrospectivamente. La presencia de un campo en JSON no prueba automatización completa.

## Validación mínima

```powershell
npm run validate:items
node tests/engine/item-data.test.js
node tests/engine/item-automation.test.js
node tests/services/item-sync.test.js
node tests/services/data-loader-cache.test.js
node tests/renderer/combat-ui.test.js
npm run build:dm-screen
npm test
git diff --check
```

Smoke manual: confirmar 1.779 resultados activos, buscar también por el nombre de una variante hija, abrir detalles representativos, añadir/equipar/usar un ítem y recargar la hoja. Probar CA/bonos/defensas, attunement permitido-bloqueado-manual, una Wand con cargas, una Potion con Bonus Action, un pack y munición mágica compatible, y una marca de efecto persistente. Comprobar que un tombstone no aparece en el picker, que una referencia histórica se abre marcada como no disponible y que un ítem homebrew sigue disponible sin cambios. Con Live Sheet activo, crear un ítem homebrew, pulsar `Dar`, entregarlo a uno y a varios jugadores, comprobar cantidad acumulada, descripción y funcionalidad textual desde `Equipment`, guardar/recargar la hoja y reconectar para confirmar que el snapshot no se pierde.

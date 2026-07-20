# Subsistema de ítems

## Responsabilidad

Este directorio implementa identidad estable, perfiles del catálogo, automatización declarativa y estado puro de recursos. No accede al DOM, Electron, saves ni texto traducido.

## Entradas

- `item-catalog.js`: identidad, variantes, tags y perfil compatible.
- `item-automation-schema.js`: contrato cerrado del overlay.
- `item-automation-registry.js`: resolución exacta de `match` a `catalogId`.
- `item-capability-compiler.js`: actions, riders, effects y modifiers compilados.
- `item-resource-state.js`: pools legacy y pools nombrados `catalogId::resourceId`.
- Datos: `src/data/items/items.json`, `items-base.json` e `item-automation.json`.

## Invariantes

- No condicionar por nombre ni interpretar narrativa durante combate.
- No modificar el conteo del catálogo ni editar `vendor/`.
- Rechazar matches ambiguos/inexistentes e IDs o referencias inválidos.
- Los modifiers persistentes deben declarar `equipmentModes`; los requisitos raciales se expresan como tags, nunca como condicionales por nombre de ítem.
- Ventajas que dependen del objetivo o del motivo de una tirada son guía visible, no ventaja global automática.
- `dawn`, `shortRest` y `longRest` son eventos distintos.
- Los spells concedidos por capabilities de item consumen su recurso declarado, nunca slots del personaje; deben conservar nombre, fuente y nivel de casteo.
- Las capabilities `oneTime` se gastan sólo al confirmar sobre una copia concreta de Equipment: el renderer separa una unidad ` {dnd-used}` y la presenta como `Used`/`Usada`, de modo que una copia nueva del mismo `catalogId` sigue siendo utilizable. `__sheetMeta.itemCapabilityUses` sólo conserva migración/auditoría de saves antiguos; no modelar este consumo como un recurso que reaparece con un descanso. `activatesStatus` debe apuntar a un status existente y removible del motor de condiciones.
- Los `attachedSpells` canónicos conservan identidad source-aware y nombre visible canónico. `charges` usa el pool real; `daily`, `rest` y `limited` con una cantidad entera declarada usan pools persistentes derivados por ítem/bucket (la variante `e` es por spell), mientras `will` no tiene límite. `daily` recupera en dawn y `rest` en Long Rest; costos no numéricos y buckets narrativos siguen manuales.
- Un DC fijo, el daño y la curación ligada a ese daño se declaran por separado y sólo se aplican tras confirmar la resolución.
- Mantener APIs legacy; una migración implícita a recurso nombrado sólo es válida cuando el caller la pide para un pool inequívoco.
- Las mutaciones de Equipment y `__sheetMeta` pertenecen al renderer y ocurren después del commit.

## Validación

Ejecutar `npm run validate:items`, `node tests/engine/item-automation.test.js`, `node tests/engine/item-resource-state.test.js` y `npm run test:items`. Ver `docs/ITEM_AUTOMATION.md`.

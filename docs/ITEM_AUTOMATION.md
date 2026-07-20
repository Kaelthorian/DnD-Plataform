# Automatización declarativa de ítems

Este subsistema añade capacidades ejecutables sin condicionales por nombre ni interpretación de la descripción durante el combate. La fuente versionada es `src/data/items/item-automation.json`; `items.json` y `items-base.json` continúan siendo el catálogo canónico sincronizable y no son modificados por el overlay.

## Flujo y responsabilidades

Antes de este subsistema, `itemAutomationProfile()` exponía arma, armadura, un recurso implícito y spells; `chargedItemTurnActions()` infería timings desde texto, `itemEffects` era sólo un booleano manual y el combate guardaba una fórmula de daño única. El flujo actual es:

1. `data-loader.js` y `item-data-worker.js` cargan catálogo, metadata y overlay. La caché v3 firma los tres archivos y `schemaVersion`.
2. `item-automation-schema.js` valida reglas soportadas. `item-automation-registry.js` resuelve cada `match` a exactamente un `catalogId`. `item-capability-compiler.js` produce recursos, acciones, riders, efectos y fallback manual.
3. `item-catalog.js` mezcla esos datos en `itemAutomationProfile()` sin cambiar sus campos legacy.
4. `action-definitions.js` conserva `damageComponents`; `resolution-engine.js` reserva economía y recursos y guarda `results.damageRolls`. El renderer sólo tira dados, valida el estado real de Equipment y aplica el commit.
5. `effect-state.js` crea instancias serializables y migra marcadores legacy. `effect-lifecycle.js` despacha eventos genéricos.

Los módulos de engine son UMD/CommonJS, puros y sin DOM. Los adaptadores de `index.html` son responsables de inventario, attunement, HP, selección guiada y persistencia en `__sheetMeta`.

Las capabilities `kind: "action"` pueden declarar `target`, `savingThrow`, componentes de `damage`, `selfHealing` y una referencia source-aware `spell`. Esas acciones aparecen tanto en Start Combat como en Attacks & Spellcasting. Una spell de item usa el nivel fijo y el recurso de la capability, no se agrega a los spells conocidos/preparados ni consume slots del personaje.

Los `attachedSpells` del catálogo se proyectan como spells temporales usando su identidad canónica nombre+fuente; el ítem otorgante queda como metadata y nunca se concatena al nombre visible. `charges` consume el pool real del item. Los buckets numéricos `daily`, `rest` y `limited` crean un contador persistente por ítem/uso: una clave sin `e` comparte el pool entre las spells del mismo bucket, mientras `1e`/`2e` da un contador a cada spell. `daily` recupera al amanecer, `rest` en Long Rest y `limited` no se recupera automáticamente. `will` permanece ilimitado. Al agotarse un pool, la spell sale de Attacks & Spellcasting y no puede confirmarse en combate; el detalle del ítem permite procesar los recursos daily al amanecer.

## Identidad y estado

- Ítem: `catalogId`, derivado de nombre, fuente y variante por el catálogo.
- Capability: ID estable local al ítem; compilado como `catalogId::capability:<id>`. Una capability `oneTime` persistida usa esa misma clave en `__sheetMeta.itemCapabilityUses` y no se recupera con descansos.
- Recurso: `catalogId::resourceId`, persistido en `__sheetMeta.itemResources`.
- Efecto: `instanceId` único por activación, persistido en `__sheetMeta.activeItemEffects`.

Los registros legacy en `itemResources[catalogId]` siguen funcionando mediante la API anterior. Una migración a un recurso nombrado debe pedir `allowLegacy: true` para una única definición inequívoca; no se copia un pool implícito a varios recursos. `itemEffects[catalogId]` sigue visible como instancia manual legacy.

## Efectos persistentes del catálogo

Las propiedades estructuradas y deterministas del catálogo no necesitan una entrada por nombre en el overlay. `persistentDefenseProfile()` aplica resistencias, inmunidades y vulnerabilidades declaradas sólo cuando la descripción confirma un alcance persistente de equipo y el ítem está en el modo correcto (`worn`, `held`, `carried` o `attuned`). `persistentAbilityScoreProfile()` hace lo mismo con `ability.static`: conserva la puntuación real en `__sheetMeta.itemAbilityScoreBases`, aplica el mayor piso válido después de ASI/background y la restaura al desequipar.

Equipment vuelve a calcular estas propiedades al agregar, quitar, equipar, desequipar o cambiar attunement. Un ítem con `reqAttune` no concede sus propiedades hasta marcarlo como attuned. Los consumibles y efectos temporales no entran en este camino aunque contengan metadata de puntuación estática; permanecen guiados hasta contar con duración y lifecycle declarativos.

Los beneficios persistentes que la metadata canónica no puede expresar completamente usan capabilities `kind: "modifier"` en el overlay. Sus `effects` admiten incrementos de ability con máximo, idiomas, sentidos, defensas y ventajas contextuales; `requirements.equipmentModes` limita worn/held y `raceExcludes` resuelve excepciones por especie sin condicionales por nombre de ítem. Idiomas, sentidos y defensas se incorporan al resumen derivado; los ability bonuses se aplican y revierten con el mismo estado base que `ability.static`.

`Belt of Dwarvenkind` es el caso de referencia: al equiparlo y sintonizarlo concede Dwarvish, CON +2 hasta 20 y recuerda la ventaja contextual de Persuasion. Para personajes que no sean dwarf/duergar añade Darkvision 60 ft, Poison Resistance y el recordatorio de ventaja en saves para evitar o terminar Poisoned. Estas ventajas no cambian todas las tiradas de Persuasion o todos los saves: el jugador sigue indicando Advantage cuando el contexto real coincide.

## Acciones y spells concedidos por items

`Balance Card` declara un uso `life-drain` que se recupera al amanecer. Su Action exige un objetivo a 30 feet, registra la salvación CON DC 17, tira 4d8 necrotic sólo al fallar y, después del commit, recupera HP propios iguales al daño aplicado. Cancelar o una salvación exitosa no cura ni gasta el uso antes de confirmar.

`Cape of the Mountebank` declara `Dimension Door|XPHB` a nivel 4 como spell de item mientras la capa está worn. El botón compartido de ambas superficies consume su uso 1/1, nunca un slot. La nube que deja el punto de partida se conserva como guía textual porque requiere una posición del mundo/VTT que la hoja no puede determinar por sí sola.

`Medal of Muscle` usa una capability `oneTime` con `activatesStatus`. Tras confirmar la Action agrega el status removible `medal-of-muscle-strength`, que aplica advantage únicamente a Strength checks y Strength saving throws durante la hora indicada; Player o DM lo quitan desde sus controles habituales de Status. El uso queda gastado de forma permanente y la medalla no vuelve a ofrecer la acción, incluso si el status se retira antes. `activatesStatus.id` debe corresponder a un status registrado en `src/engine/conditions/statuses.js`; los status de origen de ítem pueden marcarse `playerSelectable: false` para que sólo una capability los conceda, sin impedir que Player o DM los remuevan.

`Simic Guild Signet` ilustra el camino canónico sin overlay: su `attachedSpells.charges[1]` concede `Expeditious Retreat`, se resuelve como Bonus Action con el comportamiento normal de la spell, consume una de las 3 cargas del signet al confirmar y no consume un spell slot. La entrada requiere que el anillo esté worn y el item attuned.

Ambos recursos usan `recovery.trigger: "dawn"`. Long Rest no los recupera automáticamente: el detalle del item ofrece `Process dawn recovery`, ya que una campaña puede completar un Long Rest sin cruzar el amanecer.

## Añadir una capacidad

1. Localizar el registro exacto y su `catalogVariantToken` con `collectCatalogRecords()`; no inventar el `catalogId` ni asumir `root`.
2. Añadir una entrada en `item-automation.json` con `match.name`, `match.source` y `match.variantToken`.
3. Declarar recursos y capabilities con IDs kebab-case únicos. Una acción sólo puede referenciar recursos declarados en la misma entrada.
4. Usar triggers, tipos de acción, daño y áreas admitidos por el schema. Si la regla necesita geometría VTT, estado privado del DM o una decisión no modelada, declararla como `manual` y conservarla visible.
5. Ejecutar `npm run validate:items`, `npm run test:items`, `npm run test:engine`, `npm run test:renderer` y `npm test`.

## Ejemplo completo: Devotee's Censer

El registro seleccionable real es la variante `specific:flail|phb` de TCE. La definición completa versionada es:

```json
{
  "match": {
    "name": "Devotee's Censer",
    "source": "TCE",
    "variantToken": "specific:flail|phb"
  },
  "resources": [
    {
      "id": "healing-incense",
      "name": "Healing Incense",
      "max": 1,
      "recovery": { "trigger": "dawn", "amount": "full" }
    }
  ],
  "capabilities": [
    {
      "id": "radiant-strike",
      "name": "Radiant Strike",
      "kind": "attackRider",
      "trigger": { "event": "onHit", "source": "thisItemAttack" },
      "requirements": { "owned": true, "equipped": true, "attuned": true },
      "damage": [
        { "formula": "1d8", "type": "radiant", "critical": "doubleDice" }
      ]
    },
    {
      "id": "healing-incense",
      "name": "Healing Incense",
      "kind": "action",
      "activation": { "type": "bonusAction" },
      "requirements": { "owned": true, "equipped": true, "attuned": true },
      "resourceCosts": [
        { "resourceId": "healing-incense", "amount": 1 }
      ],
      "createsEffect": {
        "id": "healing-incense-cloud",
        "name": "Healing Incense Cloud",
        "duration": { "unit": "minute", "value": 1, "combatRounds": 10 },
        "area": {
          "shape": "emanation",
          "radius": 10,
          "unit": "feet",
          "anchor": "sourceActor",
          "movesWithAnchor": true
        },
        "visibility": { "obscuresVision": false },
        "hooks": [
          {
            "event": "sourceTurnStart",
            "targets": "creaturesCurrentlyInArea",
            "effect": { "kind": "healing", "formula": "1d4" }
          }
        ]
      }
    }
  ]
}
```

El ataque base sigue viniendo del flail. En hit, el log mantiene subtotales bludgeoning/radiant y un total; en miss no se ejecutan componentes `onHit`. Cada crítico duplica sólo los dados de cada componente. La Bonus Action revalida ownership, equipped, attunement y uso al abrir y confirmar; cancelar no consume nada. Long Rest procesa únicamente `longRest`; el botón explícito del drawer procesa `dawn`.

## Efectos y áreas guiadas

Al activarse, una capability crea una instancia con fuente, duración, área y hooks. `sourceTurnStart` se despacha una vez al iniciar el turno del actor fuente; no se convierte en `targetTurnStart`. Para el Censer, el jugador selecciona la party/enemigos actualmente dentro de la emanación, el propio actor permanece incluido y se tira 1d4. La hoja aplica automáticamente su propia curación; objetivos remotos quedan registrados para resolución compartida con el DM.

La fase actual no calcula posiciones, línea de visión ni solapamiento desde tokens VTT. `movesWithAnchor` y `obscuresVision` son metadata preparada para una integración geométrica futura; la emanación del Censer se muestra explícitamente como no oscurecedora y nunca se trata como Fog Cloud.

## Reglas de extensión

- No añadir handlers ni comparaciones por nombre.
- No usar texto narrativo como fuente autoritativa; regex es sólo fallback manual/legacy.
- No unir tipos de daño en una fórmula destructiva.
- No editar `vendor/` ni hacer que el sync sobrescriba el overlay.
- Rechazar overlays inválidos al cargar/validar. Una capability todavía no soportada debe ser `manual` y visible.
- Mantener `damageFormula`, `damageType` y `results.damageRoll` mientras existan consumidores legacy; los campos autoritativos nuevos son `damageComponents` y `results.damageRolls`.

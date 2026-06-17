# Adding Spells

Use this workflow for a new spell or a spell fix.

## Files To Read First

1. `src/data/spells`
2. `src/data/spells/spell.schema.json`
3. `src/engine/spell-registry.js`
4. `src/engine/spells/handlers`
5. Relevant UI only: `src/ui/sheet` or `src/ui/selectors`
6. `tests/engine`

Read `src/app/renderer/index.html` only for current wiring that has not been extracted yet.

## Data

App-owned spell data lives in `src/data/spells`.

Data should be declarative:

- ids and names
- source
- level
- school
- class/race availability
- text/entries
- optional `handler` id

Do not put casting, resource, or damage logic in JSON.

## Behavior

Each automated spell should have one isolated handler file:

`src/engine/spells/handlers/<spell-id>.js`

The handler should export a small object:

```js
module.exports = {
  id: "spell-id",
  apply(context) {
    return context;
  }
};
```

Register handlers through `src/engine/spell-registry.js`. Keep a handler focused on one spell or one tightly related spell family.

## UI

Spell UI belongs in:

- `src/ui/sheet` for spell slots, prepared/known spells, and sheet display
- `src/ui/selectors` for spell choice UI
- `src/ui/modals` for spell detail drawers or dialogs

## State

Known spells, prepared spells, spell slots, and generated sheet values are persisted as part of the sheet payload through `src/services/save-service.js`.

Do not add a second save path for spell state.

## Tests

Registry tests live in `tests/engine/spell-registry.test.js`.

Future spell handler tests should use:

`tests/engine/spells/<spell-id>.test.js`

Test handler inputs/outputs directly without starting Electron.

# Adding Feats

Use this workflow for a new feat or a feat fix.

## Files To Read First

1. `src/data/feats`
2. `src/data/feats/feat.schema.json`
3. `src/engine/feat-registry.js`
4. `src/engine/feats/handlers`
5. Relevant UI only: `src/ui/sheet`, `src/ui/skills`, or `src/ui/attacks`
6. `tests/engine`

Read `src/app/renderer/index.html` only for current wiring that has not been extracted yet.

## Data

App-owned feat data lives in `src/data/feats`.

Data should be declarative:

- ids and names
- source
- text/entries
- prerequisites
- optional `handler` id

Do not put rule calculations in JSON.

## Behavior

Each automated feat should have one isolated handler file:

`src/engine/feats/handlers/<feat-id>.js`

The handler should export a small object:

```js
module.exports = {
  id: "feat-id",
  apply(context) {
    return context;
  }
};
```

Register handlers through `src/engine/feat-registry.js`. Keep a handler focused on one feat or one tightly related feat family.

## UI

Feat UI belongs in:

- `src/ui/sheet` for sheet fields and feature display
- `src/ui/skills` for skill-related feat controls
- `src/ui/attacks` for attack-related feat controls
- `src/ui/selectors` for feat choice UI

## State

Feat choices and generated sheet values are persisted as part of the sheet payload through `src/services/save-service.js`.

Do not add a second save path for feat state.

## Tests

Registry tests live in `tests/engine/feat-registry.test.js`.

Future feat handler tests should use:

`tests/engine/feats/<feat-id>.test.js`

Test handler inputs/outputs directly without starting Electron.

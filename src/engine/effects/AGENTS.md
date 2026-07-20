# Ciclo de vida de efectos

Módulos puros UMD/CommonJS para instancias serializables y dispatch genérico. No aplican HP, posiciones VTT, estados de Electron ni DOM; devuelven ejecuciones para que el renderer/host las adapte.

- `effect-state.js` normaliza/crea instancias y conserva marcadores manuales legacy.
- `effect-lifecycle.js` despacha hooks por evento, distingue actor fuente/objetivo y expira duración en rondas.

No convertir un hook `sourceTurnStart` en hooks por objetivo. Una ejecución ocurre antes de descontar la ronda correspondiente, de modo que una duración de diez rondas puede ejecutarse diez veces. Validar con `node tests/engine/item-automation.test.js` y `npm run test:engine`.

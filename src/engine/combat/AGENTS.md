# Motor de combate

Este directorio contiene reglas puras y serializables del turno de combate. No debe acceder al DOM, Electron, `localStorage`, WebSocket ni datos ocultos del DM.

## Archivos

- `turn-economy.js`: inicio/fin de turno, Action/Bonus Action/Reaction/Movement/Object Interaction, reservas transaccionales y Extra Attack.
- `action-definitions.js`: acciones universales y adaptadores declarativos para ataques/hechizos.
- `resolution-engine.js`: sesión por pasos, Hit antes de Damage, saves, confirmación/cancelación y bloqueo de doble ejecución.
- `combat-log.js`: contrato y formato del registro de combate.

## Límites

- Las tiradas reales siguen usando los helpers de `src/app/renderer/index.html`; este motor sólo recibe y valida resultados.
- Slots, munición, cargas, HP y efectos externos se consumen mediante adaptadores del renderer al confirmar la sesión.
- El cliente nunca debe recibir AC, HP, resistencias ni modificadores privados del DM. La autoridad Live Sheet debe validar solicitudes en `src/services/live-sheet-server.js` antes de aplicar estado compartido.
- Mantener compatibilidad UMD/CommonJS para uso directo en Electron y en tests Node.

## Validación

Ejecutar `node tests/engine/combat.test.js` y luego `npm test`.

# Pruebas

## Estrategia actual

Las pruebas son scripts Node con `assert`, sin runner externo. Cubren módulos puros, diagnósticos de datos, persistencia, networking WebSocket, validación de paths de Obsidian e i18n. No existe cobertura instrumentada, test de UI end-to-end, lint ni typecheck.

| Capa | Comando | Qué valida |
| --- | --- | --- |
| Completa | `npm test` | i18n, engine, services y renderer |
| i18n | `npm run test:i18n` | paridad EN/ES, placeholders y advertencias hardcoded |
| Engine | `npm run test:engine` | backgrounds, registries, resources/rest, mecánicas de clase nivel 3 y motor de combate |
| Services | `npm run test:services` | saves, Obsidian, protocolo Live Sheet y caché/worker de catálogo |
| Renderer | `npm run test:renderer` | i18n, contratos del combat UI/rendimiento y regresiones del DM renderer |
| DM build | `npm run build:dm-screen` | transformación Vite/Tailwind y assets importados |

El test de saves usa `.test-tmp/save-service`, nunca datos reales del usuario. Los tests existentes de Obsidian/backgrounds usan directorios temporales descartables.

El test puro de descansos valida la transición 2024, gasto determinista de Hit Dice, recuperación por `recharge`, Warlock Pact Magic, Exhaustion, interrupciones, migración idempotente y preservación de recursos desconocidos.

`tests/engine/combat.test.js` cubre la economía, Extra Attack, orden Hit → Damage, saves/daño automático, movimiento, reacciones, cancelación/doble ejecución, recursos, Concentration y log. `tests/renderer/combat-ui.test.js` verifica que el shell carga los cuatro módulos, presenta todos los contadores y conserva el wiring del stepper/log.

`tests/engine/class-level3-mechanics.test.js` verifica también Weapon Mastery del Fighter 2024: tres elecciones iniciales en nivel 1, progresión 3/4/5/6, un solo reemplazo mediante Weapon Drills por Long Rest, instantánea al iniciar y restauración si el descanso se interrumpe.

`tests/renderer/combat-performance.test.js` protege el índice `Map`, la fotografía revisionada, la memoización por pasada, el worker de PDF y la concurrencia limitada. `tests/renderer/vtt-token-health-ring.test.js` verifica que jugador y DM rendericen el HP compartido como un aro alrededor del token. `tests/renderer/resize-corner-standard.test.js` exige que todas las ventanas redimensionables de ambos renderers usen la esquina inferior derecha `app-resize-corner`; no incluye textareas ni formas del mapa. `tests/renderer/floating-sheet-windows.test.js` protege el controlador/chrome común, los controles de colapsado y resize, las claves i18n, el cierre explícito y el tema oscuro sin fotos ni paneles blancos de `itemDrawer`, Character Statuses y Free Dice. `tests/services/data-loader-cache.test.js` usa JSON temporales para comprobar primera compilación, hit de caché persistente e invalidación al cambiar la fuente; no toca `userData` real. `tests/services/dm-screen-build-cache.test.js` evita que la comprobación de vigencia vuelva a mezclar las marcas de tiempo de los bundles CSS y JS.

`tests/renderer/spell-picker-performance.test.js` protege el snapshot único por apertura del administrador de spells: grants de feats/subclase, sets, conteos, límites y opciones accesibles deben reutilizarse en las filas. También exige las mediciones Performance API `spell-picker-open` y `spell-picker-level-render`.

`tests/renderer/choice-response-performance.test.js` protege la respuesta inmediata de Features & Traits y selectores relacionados: las elecciones deben agrupar `updateDerivedStats()` después del primer pintado, reutilizar un solo snapshot liviano al validar spells, actualizar las filas de spells de forma optimista y diferir el render de Equipment/Prepared Spells cuando sus paneles están fuera del viewport.

`tests/renderer/status-popup.test.js` protege el popup temporal inferior derecho: mantiene el contrato fade, permanece visible cinco segundos y conserva el tamaño ampliado con límite responsive dentro del viewport.

## Smoke test manual mínimo

1. `npm start`; confirmar que abre la Character Sheet sin error.
2. Crear/cargar una hoja, guardar, cambiar slot, volver y limpiar solo el slot activo.
3. Cambiar EN/ES y comprobar texto/valores persistidos.
4. Abrir DM Screen; comprobar que tablero y bibliotecas cargan.
5. Iniciar Live Sheet con token, conectar a `127.0.0.1`, modificar HP, tirar y desconectar.
6. Añadir/mover/redimensionar una nota/mapa y reiniciar para verificar persistencia.
7. Si se tocó Obsidian, usar un vault de prueba y verificar lectura, escritura y rechazo de `../`.
8. Si se tocó VTT/audio, verificar límites, estado compartido y que contenido oculto no llegue al jugador. Para HP de tokens, confirmar que el aro circular se actualice en el mapa del DM y en el VTT del jugador.
9. Si se tocó combate, seguir además `docs/COMBAT.md`: Hit/Miss/crit, spell save, Magic Missile, cancelación, Extra Attack, End Turn y Reaction fuera de turno.

Usar además las listas específicas en `docs/feature-map.md`, `docs/manual-testing-mercantile.md` y `docs/live-sheet-tailscale.md` cuando corresponda.

## Antes de integrar

```powershell
npm test
npm run build:dm-screen
git diff --check
git status --short
```

Revisar el diff por outputs inesperados, secrets, cambios de lockfile, datos vendorizados y bundles generados. El build completo de Electron y el arranque interactivo deben reportarse como no verificados si no se ejecutaron realmente.

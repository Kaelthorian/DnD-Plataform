# DnD-Plataform: guía para agentes

Aplicación de escritorio Electron para hojas de personaje de D&D y herramientas de Dungeon Master. El código es JavaScript/CommonJS en main, preload, servicios y hoja de personaje; el DM Screen usa React/Vite. Inglés es el idioma canónico de la interfaz del jugador y español es la traducción opcional.

## Antes de cambiar código

1. Ejecuta `git status --short` y preserva cambios ajenos.
2. Empieza por `docs/REPOSITORY_MAP.md` y el subsistema concreto. No recorras `vendor/` ni `Tokens/` salvo necesidad comprobada.
3. Traza la ruta real hasta `src/app/renderer/index.html` o `src/app/renderer/dm-screen/src/main.jsx`; muchas carpetas de `src/engine` y `src/ui` son destinos previstos y todavía no contienen implementación.
4. Reutiliza servicios, claves de estado, IPC y parsers existentes. No crees una segunda ruta de guardado, traducción, networking o carga de datos.

## Límites arquitectónicos

- `src/app/main`: ciclo de vida Electron, ventanas e IPC.
- `src/app/preload`: API mínima expuesta como `window.dndSheet`.
- `src/services`: disco, red local, traducción externa y vault de Obsidian.
- `src/engine`: reglas aisladas y comprobables sin DOM.
- `src/app/renderer`: hoja de personaje y DM Screen. Ambos contienen monolitos; extraer por subsistema, con pruebas, no mediante reescritura total.
- `src/data`: datos propios declarativos.
- `vendor/5etools-src-main`: snapshot externo de referencia y datos empaquetados. No editar por defecto.

## Reglas que deben preservarse

- Saves: mantener compatibilidad con el formato simple legado y el store v2 de seis slots. No renombrar claves del PDF ni de `__sheetMeta` sin migración.
- i18n: añadir primero una clave inglesa y la misma clave española en `src/app/renderer/i18n.js`. No traducir IDs, IPC, claves de save ni contratos de red.
- Live Sheet: es WebSocket local/Tailscale, guarda jugadores remotos solo en memoria y debe conservar validación, límites y token de sesión.
- Electron: conservar `contextIsolation: true`, `nodeIntegration: false`, preload acotado, validación de rutas y protocolos externos permitidos.
- Datos: no deduplicar nombres que solo difieren en puntuación; pueden representar entradas distintas.

## Comandos

Requiere Node `^20.19.0 || >=22.12.0`. En este checkout existe un Node portable ignorado por Git; anteponer su directorio a `PATH` si el Node del sistema es antiguo.

```powershell
npm ci
npm start
npm test
npm run build:dm-screen
npm run dist
npm run dist:portable
```

No hay scripts de lint ni typecheck. `npm run publish:win` publica una release remota y no debe ejecutarse como validación normal. `crear-instalador.bat` cambia la versión y puede reemplazar el directorio de salida; úsalo solo con autorización explícita.

## Validación mínima

- Cambio de código: prueba específica, `npm test`, `git diff --check` y revisión de `git diff`/`git status`.
- DM Screen: además `npm run build:dm-screen` y smoke test manual cuando cambie interacción o persistencia.
- Datos de backgrounds: `node scripts/diagnose-backgrounds.js`.
- Texto visible del jugador: `npm run test:i18n`; no aumentes las advertencias de hardcoded strings.
- Empaquetado: verificar por separado; no publicar ni borrar salidas existentes.

No modificar casualmente `Tokens/`, `vendor/`, `src/data/bestiary/bestiary-sublist-data.json`, los assets PDF/PNG, el `dist` versionado del DM Screen ni archivos de usuario. Consulta `docs/TESTING.md` y `docs/CODE_AUDIT.md` para límites conocidos.

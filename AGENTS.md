# DnD-Plataform: guía para agentes

Las notas del jugador forman un workspace completo de renderer: la persistencia privada es por save slot y el compartir con jugadores usa los mensajes validados de Live Sheet. Consulta `docs/PLAYER_NOTES.md` antes de modificar esa superficie.

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
- `src/engine/spells`: normalización y perfiles genéricos del catálogo de hechizos; sigue sus instrucciones locales y no supongas un handler por hechizo.
- `src/engine/items`: identidad estable, overlay declarativo, perfiles compilados y recursos múltiples; sigue `src/engine/items/AGENTS.md` y no inventes efectos narrativos ni handlers por ítem.
- `src/engine/effects`: instancias serializables y dispatch genérico; los adaptadores de HP/targets permanecen en el renderer.
- `src/engine/combat`: economía de turno, acciones declarativas, resolución transaccional y combat log. Las tiradas y adaptadores de sheet permanecen en `src/app/renderer/index.html`.
- `src/app/renderer`: hoja de personaje y DM Screen. Ambos contienen monolitos; extraer por subsistema, con pruebas, no mediante reescritura total.
- La ventana de notas del jugador sigue siendo HTML/CSS/JavaScript tradicional. Su iconografía reutilizable vive en `src/app/renderer/components/icons`, los assets offline en `src/assets`, y ambos se cargan desde `index.html`; no introducir React sólo para esa superficie.
- La iconografía global conserva dos adaptadores: la hoja clásica usa `components/icons/app-icons.js`/`dnd-icons.js`; el DM Screen React usa `dm-screen/src/components/icons`. Los controles comunes son Lucide y la fantasía usa el subconjunto offline de Game Icons generado con `npm run icons:generate`. Consulta `docs/ICON_SYSTEM.md`; no importar nombres internos de Iconify fuera de `dndIcons.jsx`.
- La pantalla de combate del jugador es una superficie completa de tres columnas: `renderer.js` actualiza iniciativa publica y portaliza el VTT conectado al `#combatMapViewport` de `index.html`; no crear una segunda conexion ni exponer HP/AC privados del DM.
- `src/data`: datos propios declarativos. El catálogo oficial activo de ítems vive en `src/data/items`; el snapshot vendor es sólo baseline de desarrollo.
- `vendor/5etools-src-main`: snapshot externo de referencia y datos empaquetados. No editar por defecto.

## Reglas que deben preservarse

- Saves: mantener compatibilidad con el formato simple legado y el store v2 de seis slots. No renombrar claves del PDF ni de `__sheetMeta` sin migración.
- i18n: añadir primero una clave inglesa y la misma clave española en `src/app/renderer/i18n.js`. No traducir IDs, IPC, claves de save ni contratos de red.
- Live Sheet: es WebSocket local/Tailscale, guarda jugadores remotos solo en memoria y debe conservar validación, límites y token de sesión.
- Electron: conservar `contextIsolation: true`, `nodeIntegration: false`, preload acotado, validación de rutas y protocolos externos permitidos.
- Datos: no deduplicar nombres que solo difieren en puntuación; pueden representar entradas distintas.
- Catálogo de ítems: sincronizar por `catalogId` (nombre+fuente+variante), nunca sólo por nombre. `item` es la única colección activa y define las 2.253 filas superiores; los `variants[].specificVariant` son identidades seleccionables sólo desde su padre, sin inflar ese conteo. Los tombstones nunca aparecen en pickers. Las entregas parciales se integran con `--add-missing`, sin mezclar ni borrar homebrew al sincronizar oficiales.
- Recursos de ítems: conservar pools legacy en `__sheetMeta.itemResources[catalogId]`; los declarativos usan `itemResources[catalogId::resourceId]`. Descontar sólo costos declarados después del commit y mantener `dawn`, `shortRest` y `longRest` como eventos distintos.
- Automatización de ítems: `src/data/items/item-automation.json` es un overlay separado del sync. Aplicar sólo reglas estructuradas deterministas; `__sheetMeta.activeItemEffects` guarda instancias y `itemEffects` sigue como marcador legacy. Targets/posición VTT quedan guiados. Ver `docs/ITEM_AUTOMATION.md`.
- Rendimiento de datos: conservar el worker/caché versionado de items y el índice en memoria; `localStorage` no es válido para catálogos grandes. Toda caché derivada debe invalidarse al cambiar sus JSON fuente.
- UI redimensionable: ventanas y notas con resize siguen usando la esquina inferior derecha `app-resize-corner`. Combat es una pantalla completa con separadores ajustables que empujan las columnas y el dock de acciones, sin arrastre ni controles de popup; su geometria se guarda bajo `dnd-character-sheet-combat-board-v1`. `itemDrawer`, Character Statuses y Free Dice reutilizan el chrome/controlador `floating-sheet-window`. El contenido usa superficies neutras oscuras y acento ambar; no reintroducir fotos de hoja/Spellbook ni paneles blancos. No aplicar ese indicador de ventana a textareas ni a formas del mapa.

## Comandos

Requiere Node `^20.19.0 || >=22.12.0`. En este checkout existe un Node portable ignorado por Git; anteponer su directorio a `PATH` si el Node del sistema es antiguo.

```powershell
npm ci
npm start
npm test
node scripts/validate-items.js
node tests/engine/item-data.test.js
node tests/engine/item-automation.test.js
node scripts/validate-spells.js
node tests/engine/spell-data.test.js
npm run build:dm-screen
npm run dist
npm run dist:portable
```

No hay scripts de lint ni typecheck. `npm run publish:win` publica una release remota y no debe ejecutarse como validación normal. `crear-instalador.bat` cambia la versión y puede reemplazar el directorio de salida; úsalo solo con autorización explícita.

## Validación mínima

- Cambio de código: prueba específica, `npm test`, `git diff --check` y revisión de `git diff`/`git status`.
- Motor/ventana de combate: `node tests/engine/combat.test.js`, `node tests/renderer/combat-ui.test.js` y el smoke test de `docs/COMBAT.md`.
- DM Screen: además `npm run build:dm-screen` y smoke test manual cuando cambie interacción o persistencia.
- Datos de backgrounds: `node scripts/diagnose-backgrounds.js`.
- Datos o runtime de spells: `node scripts/validate-spells.js` y `node tests/engine/spell-data.test.js`; si cambia la UI o combate, ejecutar también las pruebas específicas y `npm test`.
- Datos o runtime de items: seguir `docs/ADDING_ITEMS.md`; revisar el preview antes de `--apply`, ejecutar dos veces el mismo sync con `--check`, correr `npm run test:items` y verificar que tombstones no sean seleccionables pero las referencias históricas sigan abriendo.
- Texto visible del jugador: `npm run test:i18n`; no aumentes las advertencias de hardcoded strings.
- Empaquetado: verificar por separado; no publicar ni borrar salidas existentes.

No modificar casualmente `Tokens/`, `vendor/`, `src/data/bestiary/bestiary-sublist-data.json`, los assets PDF/PNG, el `dist` generado/ignorado del DM Screen ni archivos de usuario. Consulta `docs/TESTING.md` y `docs/CODE_AUDIT.md` para límites conocidos.

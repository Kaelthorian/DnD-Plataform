# Notas del jugador

## Alcance

El botón `sidebarNotesButton` abre un workspace completo de notas junto a la barra lateral. No es una ventana flotante: ocupa el área principal y deja visible la navegación del jugador.

La superficie incluye categorías, carpetas jerárquicas tipo explorador, pestañas, búsqueda, editor/preview compatible con el Markdown de Obsidian, tags reutilizables con paleta de colores, entidades vinculadas, templates, tareas con recordatorio, contador de palabras, imágenes locales, exportación y un control explícito para compartir notas con jugadores conectados. Session Notes, NPCs y Quests pueden abrirse como un listado central de títulos; seleccionar un título vuelve al editor de esa nota.

El cambio de nota usa una ruta acotada: actualiza selección, pestañas cuando corresponde y detalles de la nota activa sin reconstruir categorías, carpetas y biblioteca. El AST del preview Markdown se cachea por `note.id` y cuerpo; mientras el textarea está visible no se reconstruye el preview oculto en cada tecla.

## Persistencia privada

`src/app/renderer/renderer.js` guarda el store bajo `dnd-character-sheet-player-notes-v1:<slotId>` en `localStorage`. El store v3 contiene `folders`, `tags`, `attachments` y `notes`; las carpetas usan `parentId` para construir el árbol y los tags guardan nombre/color globales, mientras cada nota conserva título, cuerpo, categoría, tags asignados, color, tareas, links, favoritos, archivado y timestamps. El cambio de save slot vuelve a cargar el store correspondiente y normaliza stores anteriores sin perder tags existentes.

Las imágenes se eligen desde disco, se reducen en el renderer y se guardan como WebP data URL acotado dentro de `attachments`. El cuerpo sólo conserva una referencia `![[attachment:<id>|<nombre>]]`, por lo que sigue respetando el límite de 24.000 caracteres de Live Sheet. El preview resuelve únicamente esos adjuntos locales; no descarga imágenes externas. La exportación Markdown incrusta los adjuntos referenciados. Las referencias a imágenes no se retransmiten con su binario a otros jugadores y se muestran como placeholder cuando el receptor no tiene el adjunto.

Las notas del jugador no se agregan a la planilla PDF ni a `__sheetMeta`, para evitar mezclar apuntes libres con datos de personaje.

## Compartir por Live Sheet

El checkbox `notesShareToggle` publica una instantánea de la nota activa mediante el WebSocket existente:

1. `renderer.js` envía `player:note:share` con la nota completa cuando se comparte o cambia.
2. `src/services/live-sheet-server.js` valida tamaño, texto, tags, tareas y sus recordatorios, links, categoría y color; reemplaza la identidad del autor por el jugador autenticado.
3. El host mantiene la colección compartida en memoria y reenvía `dm:notes:state` al conectar, `dm:notes:upsert` al crear/editar y `dm:notes:remove` al retirar la publicación.
4. Al quitar el checkbox, la copia local sigue existiendo, pero deja de distribuirse.

El transporte hereda el token y los límites de Live Sheet. No se guarda una copia compartida en disco ni se envían credenciales. Las notas compartidas pueden editarse desde los clientes conectados; el último update recibido prevalece.

## Puntos de cambio

- UI y estado: `src/app/renderer/index.html`, `src/app/renderer/renderer.js`, `src/app/renderer/styles.css`.
- Iconografía: `src/app/renderer/components/icons/app-icons.js` expone `AppIcon` para SVG de interfaz y `dnd-icons.js` expone nombres semánticos de fantasía. Los recursos compartidos viven en `src/assets/icons` y `src/assets/textures`; no añadir URLs de assets en tiempo de ejecución. El contrato común y la frontera con el adaptador React están documentados en `docs/ICON_SYSTEM.md`.
- Parser compartido: `src/engine/obsidian-markdown.js`; el DM Screen y el preview de Notes reutilizan headings, listas/tareas, callouts, wikilinks, links, código, resaltado, cursiva, negrita y tachado.
- Traducciones: `src/app/renderer/i18n.js`.
- Validación y retransmisión: `src/services/live-sheet-server.js`.
- Contratos: `tests/renderer/player-notes.test.js` y `tests/services/live-sheet-server.test.js`.

El parser debe consumir siempre al menos una línea por iteración. Marcadores vacíos válidos como `- `, `1. ` y `# ` aparecen en los templates y están cubiertos por `tests/engine/obsidian-markdown.test.js`; no volver a separar la detección de inicio de bloque de la expresión que realmente consume ese bloque.

## Validación

```powershell
node tests/engine/obsidian-markdown.test.js
node tests/renderer/player-notes.test.js
node tests/services/live-sheet-server.test.js
npm run test:i18n
npm test
```

El test de renderer es un contrato estático; los clics, el layout responsive y la edición visual requieren un smoke test manual de Electron.

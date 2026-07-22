# Notas del jugador

## Alcance

El botón `sidebarNotesButton` abre un workspace completo de notas junto a la barra lateral. No es una ventana flotante: ocupa el área principal y deja visible la navegación del jugador.

La superficie incluye categorías, un único árbol de navegación tipo explorador, pestañas, búsqueda, editor/preview compatible con el Markdown de Obsidian, tags reutilizables con paleta de colores, carpeta principal, templates, tareas, imágenes locales, exportación y un control explícito para compartir notas con jugadores conectados. El árbol de la esquina inferior izquierda intercala carpetas, subcarpetas y notas: cada nota aparece como una hoja compacta dentro de su ruta, las carpetas pueden contraerse y los conectores visuales conservan visible el camino. El clic secundario en cualquier parte del árbol permite crear una nota o una carpeta dentro de la ruta señalada, y sobre una entrada permite borrarla. Borrar una carpeta conserva su contenido: las notas y subcarpetas directas suben al nivel de la carpeta eliminada. Las notas y carpetas se pueden arrastrar a otra carpeta para cambiar su nesting, o al fondo del árbol para devolverlas a la raíz; los movimientos de carpeta rechazan ciclos. Todas las categorías —Session Notes, NPCs, Quests, Locations, Loot, Combat Notes, Handouts y Custom— abren un listado central que muestra los tags coloreados de cada nota; cada listado incluye `New Note`, que crea la nota directamente en su categoría y en la carpeta principal correspondiente.

El panel derecho `Main folder` reemplaza a `Linked Entities`. Su selector siempre ofrece las ocho categorías y las carpetas raíz creadas por el jugador. Elegir una categoría materializa su carpeta principal de forma perezosa, mueve allí la nota y sincroniza su `category`; también se puede crear una carpeta principal raíz y asignarla en la misma operación. Crear una nota con clic secundario dentro de una carpeta de categoría, o arrastrar una nota o rama hacia ella, hereda esa categoría. Las carpetas principales de categoría permanecen en la raíz para conservar una correspondencia no ambigua; debajo de ellas se mantienen subcarpetas y nesting libre.

El cambio de nota usa una ruta acotada: actualiza selección, pestañas cuando corresponde y detalles de la nota activa sin reconstruir categorías ni el árbol. Los cambios de título, carpeta, categoría y búsqueda sí vuelven a pintar el árbol para mantener correctos la hoja, su ruta y los caminos filtrados. El cuerpo es una sola superficie visual `contenteditable`: carga el Markdown persistido mediante el parser compartido y serializa el DOM enriquecido de vuelta a Markdown en cada edición, sin un panel de preview separado. Al completar marcadores inline —por ejemplo `**texto**`, `*texto*`, `__texto__`, `~~texto~~`, `==texto==` o `` `texto` ``— `findMarkdownRichShortcut()` reemplaza únicamente ese rango por su formato visual y conserva el cursor. No reintroducir un selector `Edit`/`Preview`, una segunda superficie visible ni reconstruir el workspace completo al escribir.

El toolbar opera sobre la selección del editor visual: los comandos nativos de Chromium cubren negrita, cursiva, subrayado, tachado, headings, listas y citas; wrappers DOM acotados cubren resaltado y código; tareas, tablas, imágenes y enlaces insertan nodos serializables. El enlace usa el formulario inline `notesLinkForm`, no un `prompt()`, y restaura el rango seleccionado al aplicar la URL. Undo/redo usa el historial de edición de Chromium y después sincroniza el Markdown persistido.

## Persistencia privada

`src/app/renderer/renderer.js` guarda el store bajo `dnd-character-sheet-player-notes-v1:<slotId>` en `localStorage`. El store v4 contiene `folders`, `tags`, `attachments` y `notes`; las carpetas usan `parentId`, una carpeta raíz puede declarar su `category`, y las notas usan `folderId` para persistir el nesting sin un store paralelo. La normalización acepta stores v3: conserva sus carpetas y notas y añade metadata de categoría sólo cuando el jugador usa la nueva asignación. Los tags guardan nombre/color globales, mientras cada nota conserva título, cuerpo, categoría, tags asignados, color, tareas, links legacy, favoritos, archivado y timestamps. El cambio de save slot vuelve a cargar el store correspondiente sin perder tags existentes.

Las imágenes se eligen desde disco o se pegan desde el portapapeles en el textarea. Ambas entradas reutilizan la misma reducción a WebP y se guardan como data URL acotado dentro de `attachments`; una pegada con varias imágenes procesa como máximo seis por operación y respeta los límites globales del store. El cuerpo sólo conserva una referencia `![[attachment:<id>|<nombre>]]`, por lo que sigue respetando el límite de 24.000 caracteres de Live Sheet. El preview resuelve únicamente esos adjuntos locales; no descarga imágenes externas. La exportación Markdown incrusta los adjuntos referenciados. Las referencias a imágenes no se retransmiten con su binario a otros jugadores y se muestran como placeholder cuando el receptor no tiene el adjunto.

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
- Parser y atajos Markdown compartidos: `src/engine/obsidian-markdown.js`; el DM Screen y Notes reutilizan headings, listas/tareas, callouts, wikilinks, links, código, resaltado, cursiva, negrita y tachado. `findMarkdownRichShortcut()` mantiene comprobable sin DOM la detección que dispara el formato visual al cerrar marcadores; `createMarkdownToolbarEdit()` permanece disponible para consumidores de texto Markdown.
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

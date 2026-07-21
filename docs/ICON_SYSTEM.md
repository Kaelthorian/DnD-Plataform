# Sistema de iconos

## Frontera de arquitectura

DnD Plataform conserva los frameworks existentes:

- La hoja del jugador (`src/app/renderer/index.html`) es HTML/CSS/JavaScript tradicional. `src/app/renderer/components/icons/app-icons.js` crea SVG de interfaz y `dnd-icons.js` publica componentes semánticos de fantasía sobre esa API.
- El DM Screen (`src/app/renderer/dm-screen/src/main.jsx`) es React/Vite. `dm-screen/src/components/icons/AppIcon.jsx` usa imports estáticos de `lucide-react`; `dndIcons.jsx` encapsula `@iconify/react/offline`.

No importar nombres internos de Game Icons fuera de `dndIcons.jsx`. El resto del código usa nombres como `DiceIcon`, `QuestIcon`, `NpcIcon`, `LocationIcon`, `LootIcon`, `SpellbookIcon`, `CombatIcon`, `PotionIcon` y `TreasureIcon`.

## Datos offline

`src/app/renderer/dm-screen/src/components/icons/game-icon-data.js` contiene sólo los objetos Iconify seleccionados. Se genera desde el paquete local `@iconify-json/game-icons`:

```powershell
npm run icons:generate
npm run build:dm-screen
```

El generador determinista es `scripts/generate-dm-icon-data.js`. No se consulta la API de Iconify en runtime, no hay URLs de imágenes y el bundle no incorpora la colección completa.

## Dependencias

- `lucide-react`: controles generales del DM Screen (búsqueda, ventanas, zoom, mapa, audio y acciones).
- `@iconify/react`: renderer offline de los objetos de fantasía.
- `@iconify-json/game-icons`: fuente local reproducible para generar el subconjunto curado.

La hoja clásica no carga React ni estas dependencias en runtime; mantiene SVG locales compatibles con su arquitectura.

## Accesibilidad y estilo

- Todo botón que sólo contiene un icono necesita `aria-label` y `title`.
- El objetivo mínimo es 36 x 36 px.
- Deben existir estados hover, focus-visible y disabled.
- `AppIconButton` y `.dm-icon-button` implementan ese contrato en React. La hoja clásica aplica el mismo contrato desde `styles.css`.
- No usar emojis ni caracteres como `X`, `+` o `D` para representar iconos de producción.

## Licencias y créditos

Lucide se distribuye bajo ISC. Game Icons se distribuye bajo CC BY 3.0; la atribución visible está en `Ajustes > Créditos de iconos y recursos` y acredita a Game Icons y sus autores, incluidos Lorc y Delapouite. Los emblemas y la textura bajo `src/assets` son recursos originales locales del proyecto.

## Validación

Después de modificar la capa de iconos:

```powershell
npm run icons:generate
npm run build:dm-screen
npm run test:i18n
npm test
```

`scripts/ensure-dm-screen-build.js` incluye los componentes y el archivo curado entre las entradas que invalidan el build generado.

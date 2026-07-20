# DnD-Plataform

Aplicación de escritorio para gestionar hojas de personaje de D&D y una pantalla de Dungeon Master. El repositorio está en desarrollo activo y combina una hoja de personaje histórica con un DM Screen más reciente en React.

## Funciones verificadas

- Hoja de personaje basada en PDF con clases, razas, backgrounds, feats, spells, inventario, recursos, descansos y condiciones.
- Seis slots de guardado locales con migración desde el formato de una sola hoja.
- Interfaz del jugador en inglés, con traducción española opcional.
- Tiradas libres y de acciones, historial y animación 3D opcional.
- DM Screen con tablero persistente, biblioteca de criaturas/items/spells, notas, mapas, tokens, fog of war, audio y contenido homebrew.
- Live Sheet por WebSocket en LAN o Tailscale, con token de sesión opcional, tarjetas de jugadores, tiradas, manos levantadas y VVT compartido.
- Lectura y edición controlada de notas de un vault local de Obsidian.
- Builds de Windows NSIS y portable mediante `electron-builder`; auto-update en builds empaquetados.

## Tecnologías

Electron 31, JavaScript/CommonJS, React 19, Vite 8, Tailwind CSS 3, `ws`, PDF.js, Three.js y `electron-builder`. Los datos de referencia seleccionados provienen de un snapshot vendorizado de 5etools.

## Requisitos e instalación

- Windows es la plataforma de empaquetado configurada.
- Node `^20.19.0 || >=22.12.0`; Node 20.19.0 fue usado para la validación actual.
- npm y dependencias locales.

```powershell
npm ci
```

`npm ci` puede requerir acceso a npm si `node_modules` no existe. No se requiere ningún servicio cloud para abrir la aplicación; la traducción opcional sí envía el texto solicitado a MyMemory.

## Desarrollo y validación

```powershell
npm start
npm test
npm run build:dm-screen
```

No existen comandos de lint ni typecheck. Consulta [DEVELOPMENT](docs/DEVELOPMENT.md) y [TESTING](docs/TESTING.md) para el flujo completo.

## Empaquetado

```powershell
npm run dist
npm run dist:portable
```

Las salidas van a `installer-pdf-fields/` y están ignoradas por Git. `npm run publish:win` tiene efectos remotos y requiere autorización/credenciales; no es un comando de build local.

## Repositorio

- `src/app`: Electron main/preload y renderers.
- `src/services`: persistencia, carga, networking, traducción y Obsidian.
- `src/engine`: reglas ya extraídas del renderer.
- `src/data`: datos propios.
- `tests`: pruebas Node sin framework externo.
- `vendor/5etools-src-main`: snapshot externo.
- `Tokens`: biblioteca de imágenes de criaturas.
- `docs`: arquitectura, mapa, desarrollo, pruebas, auditoría y guías de extensión.

Empieza por [REPOSITORY_MAP](docs/REPOSITORY_MAP.md) para localizar una función y por [ARCHITECTURE](docs/ARCHITECTURE.md) para entender los límites.

## Limitaciones conocidas

- `src/app/renderer/index.html` y `dm-screen/src/main.jsx` superan 14 000 líneas cada uno y concentran demasiadas responsabilidades.
- La cobertura automática no prueba un arranque Electron completo ni la mayoría de interacciones DOM/React.
- El DM Screen carga datasets empaquetados muy grandes; el build produce dos chunks de aproximadamente 15–16 MB.
- Live Sheet usa `ws://`, escucha en las interfaces locales y no ofrece TLS ni autenticación de usuarios; activar el token y limitarlo a LAN/Tailscale.
- La hoja principal conserva CSP con `unsafe-inline` y acceso HTTP/HTTPS por su script inline y la traducción heredada.
- Varias carpetas `src/ui/*` y `src/engine/*` son destinos de extracción, no subsistemas terminados.

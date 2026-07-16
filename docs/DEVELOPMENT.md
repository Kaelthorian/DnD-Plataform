# Desarrollo

## Requisitos

- Windows para el flujo de packaging configurado.
- Node `^20.19.0 || >=22.12.0` y npm. Vite 8 exige ese rango.
- Dependencias locales instaladas con el lockfile existente.

El checkout auditado tiene Node del sistema 15.6.0, que no sirve para Vite, y un Node 20.19.0 portable bajo `.tools/` (ignorado por Git). Para esta sesión se usó:

```powershell
$portableDir = (Resolve-Path '.\.tools\node-v20.19.0-win-x64').Path
$env:Path = "$portableDir;$env:Path"
node --version
```

`pdfjs-dist` declara Node 22.13+ para su uso desde Node. El renderer usa su bundle de navegador y el build fue válido con Node 20.19; para ejecutar utilidades Node de PDF o evitar la advertencia de engine, preferir Node 22.13+.

## Instalación y ejecución

```powershell
npm ci
npm start
```

`prestart` reconstruye el DM Screen solo si falta o está desactualizado. `scripts/ensure-dm-screen-build.js` compara el CSS con sus fuentes Tailwind y el JavaScript con `main.jsx`, la configuración Vite y sus imports estáticos de datos/helpers; también exige todos los chunks declarados (`spells.js`, bestiary e items). CSS y JS se evalúan por separado: no vuelvas a usar la fecha más antigua de ambos pipelines como una sola señal porque causa un rebuild en cada arranque. No cambies npm ni regeneres `package-lock.json` sin revisar el diff; el lockfile actual es versión 1.

## Variables de entorno

No hay variables requeridas para desarrollo normal.

- `I18N_STRICT_HARDCODE=1`: convierte advertencias de strings visibles en fallos.
- `CSC_LINK`, `CSC_KEY_PASSWORD`: firma opcional de packaging; son secretos y nunca deben imprimirse ni versionarse.
- `GH_TOKEN` o `GITHUB_TOKEN`: solo publicación GitHub; no usar para build local.

## Flujos comunes

- Character Sheet: modifica source directo; `npm start` carga `index.html`.
- DM Screen: modifica `dm-screen/src/main.jsx` y ejecuta `npm run build:dm-screen`; `dm-screen/dist/` es un runtime generado e ignorado por Git que `prestart`/`predist` reconstruyen cuando corresponde.
- Backgrounds: ejecuta `node scripts/diagnose-backgrounds.js` además de pruebas.
- i18n del jugador: actualiza EN y ES juntos en `i18n.js` y ejecuta `npm run test:i18n`.
- Save/protocolo: añade pruebas de migración o payload antes de tocar UI.

## Debugging

- Los fallos de carga/render se registran desde main; no añadas logs con contenido de hojas, tokens o paths privados.
- Para encontrar lógica histórica usa los marcadores de `docs/REPOSITORY_MAP.md`.
- Live Sheet: probar primero `127.0.0.1`, luego LAN/Tailscale; mantener token activado fuera de una máquina única.
- Obsidian: todas las rutas deben seguir siendo relativas y validadas dentro del vault seleccionado.

## Dependencias

Antes de actualizar, comprobar uso actual, engines, scripts de instalación, Electron/Node soportados, tamaño y breaking changes. Actualizar de forma focalizada, ejecutar suite/build y revisar lockfile. `npm audit` requiere red y no se ejecutó durante esta auditoría; autorizarlo explícitamente antes de enviar metadatos de dependencias al registry.

## Packaging

`npm run dist` y `npm run dist:portable` escriben en `installer-pdf-fields/`. No ejecutar si hay una salida que deba preservarse sin elegir antes una ruta segura. `crear-instalador.bat` cambia la versión y puede borrar/reemplazar esa salida. `npm run publish:win` sube artefactos y puede volver pública una release: nunca usarlo como comprobación local.

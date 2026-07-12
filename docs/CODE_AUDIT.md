# Auditoría técnica

Fecha: 2026-07-12  
Alcance: código propio, configuración, scripts, tests, documentación, rutas de datos empaquetadas y límites de vendor/assets. No se realizó auditoría online de dependencias ni inspección exhaustiva del source vendorizado.

## Fortalezas confirmadas

- Electron separa main/preload/renderer, con `contextIsolation` activo y Node desactivado en renderer.
- Preload expone operaciones concretas; no entrega IPC o filesystem genérico.
- Obsidian valida extensión, existencia, `realpath` y permanencia dentro del vault.
- Live Sheet limita payloads, valida tipos, sanitiza mensajes/VVT/audio y soporta token de sesión.
- Saves migran el formato histórico a seis slots sin borrar campos desconocidos.
- Tests reales cubren reglas centrales, datos, i18n, networking y path traversal.
- Datos propios y snapshot vendorizado están separados; packaging incluye rutas explícitas.

## Hallazgos confirmados

| Severidad | Hallazgo e impacto | Estado / siguiente acción |
| --- | --- | --- |
| Alta | `index.html` (~14 000 líneas) mezcla DOM, reglas, persistencia, inventario, spells/feats y tiradas. Regresión difícil y alto coste de navegación. | Pendiente: extracción incremental con tests por dominio; no reescribir. |
| Alta | `dm-screen/src/main.jsx` (~14 000 líneas) mezcla tablero, bibliotecas, VVT, audio, networking y Obsidian. | Pendiente: separar primero parsers/serialización y servicios puros. |
| Alta | Save principal se escribía directamente; una interrupción podía truncarlo y no existía fallback. | Corregido y probado: temp + rename, backup válido y recuperación. |
| Media | `setWindowOpenHandler` enviaba cualquier esquema a `shell.openExternal`. | Corregido: solo HTTP/HTTPS. |
| Media | Live Sheet escucha `0.0.0.0`; el token puede desactivarse y no hay TLS. Expone hojas a la red alcanzable. | Diseño LAN/Tailscale; mantener token activo y documentar frontera. |
| Media | Traducción de descripciones envía texto a `api.mymemory.translated.net`; CSP permite HTTP/HTTPS y la hoja usa script inline. | Pendiente: aviso de privacidad visible, eliminar fallback renderer y extraer inline antes de endurecer CSP. |
| Media | Build genera chunks `items.js` (~15,8 MB) y `bestiary-sublist-data.js` (~15,6 MB). Impacta tamaño/startup/memoria. | Pendiente: índices livianos y carga diferida medida; no micro-optimizar. |
| Media | Cobertura se concentra en módulos extraídos; no hay Electron smoke automatizado, E2E, lint, typecheck ni CI propio. | Añadir pruebas al extraer; evaluar smoke test y lint sin reforma masiva. |
| Media | 122 posibles strings visibles hardcoded en Character Sheet; DM Screen usa español hardcoded. | Baseline conocido; no aumentar y migrar por componente. |
| Media | Documentación describía carpetas vacías como sistemas implementados y faltaban README/AGENTS/mapa/auditoría raíz. | Corregido en documentación nueva/actualizada. |
| Baja | `5etools-src-main/` contiene dos JSON de feats no referenciados y existen `FEATURE_MAP.md`/`feature-map.md`. | Candidatos a consolidación; no eliminados sin aprobación específica. |
| Baja | `package-lock.json` es v1 y el Node del sistema detectado es 15.6.0; Vite exige 20.19+/22.12+. | Requisito `engines` y procedimiento portable documentados. |
| Baja | `npm ls --depth=0` informa el peer faltante `electron-builder-squirrel-windows`; el target configurado es NSIS, no Squirrel. | Verificar en una tarea de packaging; no añadir dependencia sin confirmar necesidad. |
| Baja | `pdfjs-dist@6.0.227` declara Node 22.13+ aunque la app consume su bundle de navegador y el build pasó con Node 20.19. | Puede advertir al instalar; validar el inspector Node por separado o usar Node 22.13+ cuando corresponda. |
| Baja | `caniuse-lite` está desactualizado según el build. | Actualizar solo en una tarea de dependencias con red autorizada y diff revisado. |

No se confirmaron dependencias circulares en los módulos CommonJS inspeccionados; la UI histórica usa globals y orden de scripts, por lo que un detector convencional no cubriría su acoplamiento real. Tampoco se confirmó código muerto suficiente para borrado seguro.

## Cambios completados

- Persistencia atómica, backup y recuperación de JSON válido.
- Test específico de migración, backup, recuperación y limpieza de temporales.
- Lista de protocolos externos permitidos.
- Requisito Node y patrones de higiene/secrets en `.gitignore`.
- Documentación operativa, arquitectónica, de pruebas y decisiones basada en rutas reales.

## Trabajo futuro recomendado

1. Alta: pruebas DOM/Electron de save/load y startup; luego extraer un dominio del Character Sheet.
2. Alta: extraer del DM Screen serialización/parsers de board/VVT con pruebas antes de dividir componentes.
3. Media: diseñar índices livianos/carga diferida para datasets grandes y medir tiempo/memoria.
4. Media: migrar traducción a main exclusivamente, añadir aviso de privacidad y endurecer CSP.
5. Media: mantener token Live Sheet obligatorio fuera de loopback o añadir una opción de bind explícita.
6. Baja: con aprobación, eliminar duplicados confirmados y consolidar mapas/documentos aspiracionales.

## Verificación y límites

Se ejecutaron `npm test`, `npm run build:dm-screen`, parseo de JSON empaquetado seleccionado, checks de sintaxis y `git diff --check`. No se ejecutaron packaging completo, arranque GUI, smoke manual, `npm audit`, publicación ni instalación. Consultar el informe final de la tarea para resultados posteriores a todos los cambios.

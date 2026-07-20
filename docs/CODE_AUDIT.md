# Auditoría técnica

Fecha: 2026-07-20
Alcance: código propio, configuración, scripts, tests, documentación, rutas de datos empaquetadas y límites de vendor/assets. No se realizó auditoría online de dependencias ni inspección exhaustiva del source vendorizado.

## Fortalezas confirmadas

- Electron separa main/preload/renderer, con `contextIsolation` activo y Node desactivado en renderer.
- Preload expone operaciones concretas; no entrega IPC o filesystem genérico.
- Obsidian valida extensión, existencia, `realpath` y permanencia dentro del vault.
- Live Sheet limita payloads, valida tipos, sanitiza mensajes/VTT/audio y soporta token de sesión.
- Saves migran el formato histórico a seis slots sin borrar campos desconocidos.
- Tests reales cubren reglas centrales, datos, i18n, networking y path traversal.
- Datos propios y snapshot vendorizado están separados; packaging incluye rutas explícitas.

## Hallazgos confirmados

| Severidad | Hallazgo e impacto | Estado / siguiente acción |
| --- | --- | --- |
| Alta | `index.html` (~14 000 líneas) mezcla DOM, reglas, persistencia, inventario, spells/feats y tiradas. Regresión difícil y alto coste de navegación. | Pendiente: extracción incremental con tests por dominio; no reescribir. |
| Alta | `dm-screen/src/main.jsx` (~14 000 líneas) mezcla tablero, bibliotecas, VTT, audio, networking y Obsidian. | Pendiente: separar primero parsers/serialización y servicios puros. |
| Alta | Save principal se escribía directamente; una interrupción podía truncarlo y no existía fallback. | Corregido y probado: temp + rename, backup válido y recuperación. |
| Media | `setWindowOpenHandler` enviaba cualquier esquema a `shell.openExternal`. | Corregido: solo HTTP/HTTPS. |
| Media | Live Sheet escucha `0.0.0.0`; el token puede desactivarse y no hay TLS. Expone hojas a la red alcanzable. | Diseño LAN/Tailscale; mantener token activo y documentar frontera. |
| Media | Traducción de descripciones envía texto a `api.mymemory.translated.net`; CSP permite HTTP/HTTPS y la hoja usa script inline. | Pendiente: aviso de privacidad visible, eliminar fallback renderer y extraer inline antes de endurecer CSP. |
| Media | Build genera chunks grandes para el catálogo app-owned `items.js` y `bestiary-sublist-data.js`. Aunque items ya no mezcla `baseitem` activo, el JSON estructurado sigue impactando tamaño/startup/memoria. | Pendiente: medir el nuevo bundle, diseñar índices livianos/carga diferida y no micro-optimizar sin perfil. |
| Media | El catálogo conserva metadata rica (cargas, spells, efectos, vehículos y excepciones), pero no existe un intérprete autoritativo capaz de automatizar todas las reglas narrativas de 1.779 items. | Mantener automatización genérica sólo para casos deterministas y mostrar el resto como detalle/acción guiada; ampliar por familias con tests, no handlers vacíos por item. |
| Media | `__sheetMeta.itemResources`, `itemAttunement` e `itemEffects` usan `catalogId` y no una identidad de instancia: dos copias del mismo item comparten contador, sintonización y marcador. Los usos `daily`/`rest`/`will` de `attachedSpells` tampoco declaran siempre si `1` y `1e` son pools compartidos o por conjuro. | Mantener esos ledgers guiados/manuales; introducir IDs de instancia de inventario y un contrato explícito de pools antes de automatizar copias o recuperaciones por descanso. |
| Media | La sintonización valida tags deterministas disponibles en la hoja, pero no impone todavía el máximo global de tres ítems y deja requisitos narrativos/alineamiento como confirmación manual. | Modelar slots de attunement e identidades de instancia antes de imponer el límite; conservar el texto original para requisitos no verificables. |
| Media | Los efectos narrativos/temporales de ítems sólo tienen una marca persistente guiada; defensas se incorporan al resumen pero no existe un pipeline autoritativo de daño/HP. Bonos contextuales como `bonusSpellDamage` no se aplican globalmente. | Mantener esas reglas manuales hasta contar con duración, target, tipo de daño y resolución transaccional probados. |
| Media | Los packs de munición nuevos se expanden al agregarlos, pero inventarios legacy que ya guardaron el nombre del pack no se migran a unidades. | Añadir una migración idempotente cuando Equipment disponga de identidad de instancia y pueda distinguir pack intacto de texto manual. |
| Baja | Las referencias antiguas sólo por nombre son ambiguas para algunos registros; se conserva la preferencia histórica por fuentes modernas, mientras las escrituras nuevas guardan fuente/variante o `catalogId`. | Mantener el fallback sólo para compatibilidad y ofrecer una migración asistida si se necesita precisión retrospectiva. |
| Media | Cobertura se concentra en módulos extraídos; no hay Electron smoke automatizado, E2E, lint, typecheck ni CI propio. | Añadir pruebas al extraer; evaluar smoke test y lint sin reforma masiva. |
| Media | 117 posibles strings visibles hardcoded en Character Sheet; DM Screen usa español hardcoded. | Baseline conocido; no aumentar y migrar por componente. |
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
- Catálogo oficial de items app-owned con identidad nombre+fuente+variante, sincronización preview/apply/check, backup portable y reversible, tombstones históricos y separación de homebrew.

## Trabajo futuro recomendado

1. Alta: pruebas DOM/Electron de save/load y startup; luego extraer un dominio del Character Sheet.
2. Alta: extraer del DM Screen serialización/parsers de board/VTT con pruebas antes de dividir componentes.
3. Media: diseñar índices livianos/carga diferida para datasets grandes y medir tiempo/memoria.
4. Media: ampliar reglas de items por familias (efectos temporales, attunement global y vehículos) y diseñar IDs de instancia/pools de usos antes de automatizar decisiones abiertas; cargas numéricas, sintonización determinista y commit transaccional ya tienen cobertura focalizada.
5. Media: migrar traducción a main exclusivamente, añadir aviso de privacidad y endurecer CSP.
6. Media: mantener token Live Sheet obligatorio fuera de loopback o añadir una opción de bind explícita.
7. Baja: con aprobación, eliminar duplicados confirmados y consolidar mapas/documentos aspiracionales.

## Verificación y límites

Se ejecutaron `npm test`, `npm run build:dm-screen`, parseo de JSON empaquetado seleccionado, checks de sintaxis y `git diff --check`. No se ejecutaron packaging completo, arranque GUI, smoke manual, `npm audit`, publicación ni instalación. Consultar el informe final de la tarea para resultados posteriores a todos los cambios.

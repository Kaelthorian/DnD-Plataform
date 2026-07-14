# Pruebas

## Estrategia actual

Las pruebas son scripts Node con `assert`, sin runner externo. Cubren módulos puros, diagnósticos de datos, persistencia, networking WebSocket, validación de paths de Obsidian e i18n. No existe cobertura instrumentada, test de UI end-to-end, lint ni typecheck.

| Capa | Comando | Qué valida |
| --- | --- | --- |
| Completa | `npm test` | i18n, engine, services y renderer |
| i18n | `npm run test:i18n` | paridad EN/ES, placeholders y advertencias hardcoded |
| Engine | `npm run test:engine` | backgrounds, registries, resources/rest y mecánicas de clase nivel 3 |
| Services | `npm run test:services` | saves, Obsidian y protocolo Live Sheet |
| Renderer | `npm run test:renderer` | helpers i18n cargables en Node |
| DM build | `npm run build:dm-screen` | transformación Vite/Tailwind y assets importados |

El test de saves usa `.test-tmp/save-service`, nunca datos reales del usuario. Los tests existentes de Obsidian/backgrounds usan directorios temporales descartables.

## Smoke test manual mínimo

1. `npm start`; confirmar que abre la Character Sheet sin error.
2. Crear/cargar una hoja, guardar, cambiar slot, volver y limpiar solo el slot activo.
3. Cambiar EN/ES y comprobar texto/valores persistidos.
4. Abrir DM Screen; comprobar que tablero y bibliotecas cargan.
5. Iniciar Live Sheet con token, conectar a `127.0.0.1`, modificar HP, tirar y desconectar.
6. Añadir/mover/redimensionar una nota/mapa y reiniciar para verificar persistencia.
7. Si se tocó Obsidian, usar un vault de prueba y verificar lectura, escritura y rechazo de `../`.
8. Si se tocó VTT/audio, verificar límites, estado compartido y que contenido oculto no llegue al jugador.

Usar además las listas específicas en `docs/feature-map.md`, `docs/manual-testing-mercantile.md` y `docs/live-sheet-tailscale.md` cuando corresponda.

## Antes de integrar

```powershell
npm test
npm run build:dm-screen
git diff --check
git status --short
```

Revisar el diff por outputs inesperados, secrets, cambios de lockfile, datos vendorizados y bundles generados. El build completo de Electron y el arranque interactivo deben reportarse como no verificados si no se ejecutaron realmente.

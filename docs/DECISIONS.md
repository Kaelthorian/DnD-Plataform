# Decisiones arquitectónicas

## 1. Extraer los renderers de forma incremental

Contexto: Character Sheet y DM Screen son monolitos funcionales con poca cobertura de UI.  
Decisión: mover una responsabilidad por vez hacia engine/UI/services solo cuando exista prueba o smoke test específico.  
Consecuencia: la estructura seguirá híbrida temporalmente, pero reduce el riesgo de romper reglas, saves y workflows.  
Alternativa rechazada: reescritura o reorganización masiva por estética.

## 2. Tratar 5etools como vendor

Contexto: el snapshot es voluminoso y packaging consume archivos concretos.  
Decisión: datos propios viven en `src/data`; vendor solo se modifica en una sincronización explícita.  
Consecuencia: loaders deben documentar la procedencia y no crear copias adicionales.  
Alternativa rechazada: mezclar el snapshot con reglas de aplicación o recorrerlo para tareas no relacionadas.

## 3. Mantener compatibilidad de saves

Contexto: existen hojas históricas de objeto simple y store v2 de seis slots.  
Decisión: normalizar preservando campos desconocidos, migrar legado a `slot-1`, escribir atómicamente y conservar el último JSON válido.  
Consecuencia: cambios de esquema requieren migración y prueba; claves internas no se renombran por presentación.  
Alternativa rechazada: reset/regeneración silenciosa de datos.

## 4. Live Sheet es una sesión local efímera

Contexto: la función conecta jugadores con DM por LAN/Tailscale sin backend.  
Decisión: main posee el servidor, valida mensajes y mantiene jugadores/VVT en memoria; no escribe datos remotos en saves.  
Consecuencia: reiniciar pierde la sesión y `ws://` no debe exponerse a Internet pública; usar token.  
Alternativa rechazada: relay cloud, cuentas o persistencia automática sin un diseño explícito.

## 5. Inglés canónico, español opcional para jugador

Contexto: IDs/datos/reglas usan inglés y la UI del jugador ofrece español.  
Decisión: claves EN son fuente, ES mantiene paridad; contratos y claves persistidas no se traducen.  
Consecuencia: texto nuevo del jugador requiere ambas entradas y `npm run test:i18n`.  
Alternativa rechazada: duplicar lógica o traducir identificadores internos.

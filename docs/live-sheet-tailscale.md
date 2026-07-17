# Live Sheet con Tailscale

Live Sheet usa un servidor WebSocket local en la PC del DM. Tailscale permite que los jugadores lleguen a ese servidor como si estuvieran en una LAN privada, sin IP publica, sin abrir puertos del router, sin port forwarding y sin backend externo.

## Requisitos

- DM y jugadores con Tailscale instalado y conectado.
- Todos dentro del mismo tailnet, o con acceso compartido al dispositivo del DM.
- La app corriendo dentro de Electron. El host se inicia desde el DM Screen.
- Windows Firewall debe permitir Planilla DnD / Electron en redes privadas.

## Encontrar la IP Tailscale del DM

La IP Tailscale normalmente empieza con `100.` y pertenece al rango `100.64.0.0/10`. Al tocar **Start Host**, el panel **Live Players** muestra la URL recomendada, por ejemplo:

```text
ws://100.x.y.z:8787
```

Tambien se puede ver desde Tailscale o con:

```sh
tailscale ip -4
```

La app no depende del comando `tailscale`; detecta la IP por las interfaces de red del sistema.

## MagicDNS

Si MagicDNS esta activo, los jugadores pueden usar el nombre del equipo del DM, por ejemplo:

```text
kael-pc
kael-pc.tailnet-name.ts.net
```

La app no inventa nombres MagicDNS. El DM puede escribir el nombre manualmente en el campo **MagicDNS host** del DM Screen para copiar una URL como:

```text
ws://kael-pc:8787
```

## Iniciar host

1. Abrir la app Electron.
2. Abrir **DM Screen**.
3. En **Live Players**, dejar el puerto `8787` o elegir otro.
4. Mantener **Session token** activado para Tailscale.
5. Tocar **Start Host**.
6. Copiar la URL recomendada y el session code/token.

El panel muestra:

- **Tailscale detected** si encuentra una IP Tailscale.
- **Local test OK** si `ws://127.0.0.1:PORT` responde.
- **Tailscale self-test OK** si `ws://TAILSCALE_IP:PORT` responde desde la misma maquina.

## Conectar jugador

1. Abrir la Character Sheet.
2. Ir a **Connect to DM**.
3. En **DM host / Tailscale IP**, escribir `100.x.y.z` o el MagicDNS del DM.
4. Dejar el puerto `8787` salvo que el DM haya usado otro.
5. Pegar el session token si esta activado.
6. Tocar **Connect**.

El cliente manda `player:hello` y enseguida un `sheet:update` completo. Cuando el servidor confirma la planilla, el jugador ve **Synced with DM** y el DM ve la sheet inmediatamente. La nota del jugador en el DM Screen incluye una lista colapsable **Status**: muestra buffs/debuffs activos y permite agregarlos o quitarlos; solo se comparten los IDs validados de esos estados, no el resto de `__sheetMeta`.

## Si falla

- Probar `ping 100.x.y.z` desde la PC del jugador.
- Probar el nombre MagicDNS si la IP no responde.
- Confirmar que ambos equipos estan conectados a Tailscale.
- Confirmar que el jugador esta en el mismo tailnet o tiene acceso compartido al dispositivo del DM.
- Revisar Windows Firewall y permitir Planilla DnD / Electron en redes privadas.
- Revisar que el DM Screen este abierto dentro de Electron.
- Revisar que el puerto no este ocupado.
- Si **Local test OK** pero **Tailscale self-test failed**, el host arranco pero no responde por Tailscale; revisar Windows Firewall.

## Importante

- No uses tu IP publica.
- No abras port forwarding.
- Tailscale mode reemplaza la necesidad de exponer el puerto a internet.
- No usa Tailscale Funnel ni Serve.
- LAN normal sigue disponible como fallback para jugadores en la misma red local.

## Probar en una sola PC

1. Con Tailscale abierto, iniciar host desde DM Screen.
2. Verificar **Local test OK**.
3. Si aparece una IP `100.x.y.z`, verificar **Tailscale self-test OK**.
4. Abrir Character Sheet en la misma app o en otra instancia.
5. Conectar a `127.0.0.1` para test local, o a la IP `100.x.y.z` para test Tailscale local.

## Probar con dos PCs

1. En la PC del DM, iniciar Tailscale y luego **Start Host**.
2. Copiar `ws://100.x.y.z:8787` y el session token.
3. En la PC del jugador, confirmar que Tailscale este conectado.
4. Probar `ping 100.x.y.z`.
5. En **Connect to DM**, escribir `100.x.y.z`, puerto `8787`, nombre de jugador y token.
6. Tocar **Connect** y verificar **Synced with DM**.


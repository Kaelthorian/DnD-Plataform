# Live Sheet: Direct Internet Host (fase 1)

## Modelo de conexion

Direct Internet Host no es P2P verdadero. El DM sigue siendo el host autoritativo y cada jugador abre una conexion WebSocket directa hacia la PC del DM:

```text
jugador -> IP publica o dominio del DM:puerto TCP -> router del DM -> PC del DM
```

El modo reutiliza el mismo servidor y protocolo Live Sheet de LAN y Tailscale. No crea un segundo servidor, relay, cuenta ni servicio cloud.

## Elegir el modo correcto

- **LAN**: usar la IPv4 privada del DM, por ejemplo `192.168.1.25:8787`. Solo funciona dentro de la misma red local. Una IPv4 privada nunca se presenta como direccion de Internet.
- **Tailscale**: opcion recomendada cuando el DM esta detras de CGNAT o no quiere exponer un puerto. Se conserva el flujo existente con IP `100.x.y.z` o MagicDNS.
- **Direct Internet Host**: fase 1 con IPv4 publica o dominio que resuelva a IPv4 publica y port forwarding TCP manual. El codigo de sesion es obligatorio.

La fase 1 enlaza el servidor en IPv4 (`0.0.0.0`). IPv6 publica directa no esta soportada. Un dominio se acepta como entrada, pero la aplicacion no lo resuelve ni verifica.

## Antes de iniciar

1. Elegir un puerto TCP entre 1 y 65535. El valor predeterminado es `8787`.
2. Identificar la IPv4 LAN de la PC del DM. Conviene reservarla en DHCP para que no cambie.
3. Abrir la pagina de administracion del router y localizar la direccion **Internet/WAN IPv4**.
4. Obtener la IPv4 publica por un medio confiable del ISP o una comprobacion independiente. La aplicacion no consulta servicios externos.
5. Comparar WAN y publica antes de crear el mapeo.

No pegar credenciales del router, contrasenas ni datos personales en la aplicacion. Solo se necesita la direccion WAN mostrada por el router para el diagnostico opcional.

## Detectar CGNAT y doble NAT

No existe conexion directa entrante cuando el ISP mantiene al DM detras de CGNAT y no ofrece una IPv4 publica enrutable.

Indicadores:

- WAN dentro de `100.64.0.0/10`: CGNAT. Direct Internet no es posible con port forwarding en el router local.
- WAN dentro de `10.0.0.0/8`, `172.16.0.0/12` o `192.168.0.0/16`: doble NAT o posible CGNAT.
- WAN publica distinta de la IPv4 publica observada: posible NAT aguas arriba o CGNAT.
- El router no ofrece controles de port forwarding o el ISP comparte una IPv4 entre clientes: consultar al ISP.

Con doble NAT controlable hay que reenviar el mismo puerto en cada router, desde el equipo aguas arriba hasta el router conectado a la PC del DM. Con CGNAT del ISP eso no alcanza.

Alternativas para CGNAT:

1. usar Tailscale, que ya esta soportado;
2. solicitar al ISP una IPv4 publica;
3. usar un relay solo si se disena y aprueba expresamente en otra fase.

## Configurar el router manualmente

Los nombres cambian segun el fabricante: Port Forwarding, Virtual Server, NAT Rule o Port Mapping.

Crear una regla con estos valores:

- protocolo: **TCP**;
- puerto externo: el puerto elegido, por ejemplo `8787`;
- IPv4 interna/destino: la IPv4 LAN de la PC del DM;
- puerto interno: el mismo puerto, por ejemplo `8787`;
- alcance remoto: restringirlo si el router permite limitar las IP de origen.

No hace falta abrir UDP. La aplicacion no ejecuta UPnP, NAT-PMP ni PCP y no modifica el router.

Rollback: desactivar o eliminar exclusivamente esa regla de port forwarding cuando termine la sesion.

## Firewall local

La aplicacion no abre Windows Firewall automaticamente.

1. Iniciar el host y ejecutar **Run tests**.
2. Si la prueba local falla, resolver primero el listener o el puerto ocupado.
3. Si loopback funciona pero otro equipo LAN no conecta, revisar Windows Firewall.
4. Si se crea una regla manual, limitarla a la aplicacion/puerto y al perfil de red necesario. No desactivar el firewall completo.

Rollback: desactivar o eliminar exclusivamente la regla creada para la aplicacion o puerto.

## Iniciar y compartir

1. En DM Screen > Live Players elegir **Direct Internet Host**.
2. Escribir la IPv4 publica o dominio.
3. Opcionalmente escribir la WAN IPv4 del router para el diagnostico de CGNAT.
4. Elegir el puerto y pulsar **Refresh diagnostics**.
5. Corregir cualquier error de direccion privada o CGNAT.
6. Pulsar **Start Host**.
7. Compartir por un canal privado:
   - la direccion `IP:PUERTO` o `DOMINIO:PUERTO`;
   - el codigo de sesion generado.

El token se genera con 32 bytes aleatorios en base64url para cada inicio Direct Internet. Se mantiene solo en memoria, no se guarda en saves ni en `localStorage`, y no debe copiarse a logs o canales publicos.

El jugador elige **Direct Internet**, pega host/dominio, puerto y codigo en el panel existente **Connect to DM**.

## Verificacion correcta

La prueba local confirma solamente que el listener responde en la propia PC. No confirma:

- port forwarding;
- firewall para trafico entrante;
- DNS;
- ausencia de CGNAT;
- alcance desde Internet.

La verificacion real requiere que un jugador pruebe desde otra red, por ejemplo datos moviles y no el mismo Wi-Fi. Incluso despues de una conexion exitosa, la UI mantiene el diagnostico de alcance publico como no verificado porque esta fase no usa un comprobador externo independiente.

Errores accionables:

- **Port already in use**: detener la aplicacion que usa el puerto o elegir otro y actualizar tambien el router.
- **Private public host**: no usar la IPv4 LAN ni la IP Tailscale como direccion de Internet.
- **CGNAT detected**: Direct Internet no es posible; usar Tailscale o pedir IPv4 publica al ISP.
- **Port mapping unverified**: revisar destino LAN, protocolo TCP y puertos externo/interno.
- **Firewall unverified**: comprobar una regla acotada; no desactivar protecciones.
- **Local test failed**: resolver listener/puerto antes de probar el router.

## Seguridad de transporte

La fase 1 usa `ws://`, que no cifra el contenido. El codigo de sesion controla acceso al protocolo, pero no convierte `ws://` en transporte seguro. Live Sheet sigue excluyendo `__sheetMeta`; aun asi, los datos publicos de la hoja y el VTT viajan sin cifrado.

Ruta futura para `wss://`:

- certificados y clave privada proporcionados y gestionados por el usuario;
- validacion de rutas/permisos en main;
- listener TLS en el mismo servicio;
- renovacion, errores y documentacion de certificados;
- opcion explicita sin downgrade silencioso a `ws://`.

WebRTC seria otro proyecto: requiere senalizacion y normalmente STUN; bajo NAT restrictivo/CGNAT necesita TURN, que actua como relay. No se implementan senalizacion, TURN, cuentas ni cloud en esta tarea.

## Fase 2 opcional, no implementada

UPnP, NAT-PMP o PCP podrian automatizar el mapeo en routers compatibles. Esa fase debe ser separada, reversible y pedir confirmacion antes de modificar el router. Tambien debe mostrar la regla exacta, su duracion y como retirarla. No forma parte de la fase 1.

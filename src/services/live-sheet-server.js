const os = require("os");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const { WebSocket, WebSocketServer } = require("ws");

const DEFAULT_PORT = 8787;
const MAX_MESSAGE_BYTES = 512 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_ROLL_TEXT_LENGTH = 600;
const MAX_VVT_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VVT_FOG_POINTS = 1200;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, maxLength = MAX_NAME_LENGTH) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizePlayerId(value) {
  return sanitizeText(value, 120).replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 120);
}

function normalizePort(port) {
  const parsed = Number.parseInt(port, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return DEFAULT_PORT;
  return parsed;
}

function isTailscaleIpv4(address) {
  const parts = String(address || "").split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function isTailscaleInterfaceName(name) {
  return /tailscale|utun/i.test(String(name || ""));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function listLocalAddresses(networkInterfaces = os.networkInterfaces()) {
  const tailscaleAddresses = [];
  const lanAddresses = [];

  Object.entries(networkInterfaces || {}).forEach(([name, entries]) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== "IPv4" || entry.internal || !entry.address) return;
      if (isTailscaleInterfaceName(name) || isTailscaleIpv4(entry.address)) {
        tailscaleAddresses.push(entry.address);
        return;
      }
      lanAddresses.push(entry.address);
    });
  });

  return {
    tailscaleAddresses: unique(tailscaleAddresses),
    lanAddresses: unique(lanAddresses),
    allAddresses: unique([...tailscaleAddresses, ...lanAddresses])
  };
}

function sanitizeRollEvent(roll) {
  if (!isPlainObject(roll)) return null;
  return {
    title: sanitizeText(roll.title, 140) || "Tirada",
    result: sanitizeText(roll.result, 80),
    detail: sanitizeText(roll.detail, MAX_ROLL_TEXT_LENGTH),
    timestamp: sanitizeText(roll.timestamp, 40) || new Date().toISOString()
  };
}

function sanitizeSheetPatch(patch) {
  if (!isPlainObject(patch)) return null;
  const sanitized = {};
  Object.entries(patch).forEach(([key, value]) => {
    const normalizedKey = sanitizeText(key, 120);
    if (!normalizedKey || normalizedKey === "__proto__" || normalizedKey === "constructor" || normalizedKey === "prototype") return;
    if (typeof value === "boolean") {
      sanitized[normalizedKey] = value;
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[normalizedKey] = String(value);
      return;
    }
    if (typeof value === "string") sanitized[normalizedKey] = sanitizeText(value, 5000);
  });
  return Object.keys(sanitized).length ? sanitized : null;
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeDataUrl(value) {
  const text = String(value || "");
  if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(text)) return "";
  if (Buffer.byteLength(text, "utf8") > MAX_VVT_IMAGE_BYTES) return "";
  return text;
}

function sanitizeVvtFog(fog) {
  const source = isPlainObject(fog) ? fog : {};
  const revealed = Array.isArray(source.revealed)
    ? source.revealed.slice(-MAX_VVT_FOG_POINTS).map((point) => ({
      x: clampNumber(point?.x, 0, 1, 0),
      y: clampNumber(point?.y, 0, 1, 0),
      rx: clampNumber(point?.rx ?? point?.r, 0.001, 1, 0.06),
      ry: clampNumber(point?.ry ?? point?.r, 0.001, 1, 0.06)
    }))
    : [];
  return {
    enabled: source.enabled !== false,
    brushSize: clampNumber(source.brushSize, 8, 360, 90),
    revealed
  };
}

function sanitizeVvtGrid(grid) {
  const source = isPlainObject(grid) ? grid : {};
  return {
    enabled: Boolean(source.enabled),
    cellWidth: clampNumber(source.cellWidth, 8, 500, 70),
    cellHeight: clampNumber(source.cellHeight, 8, 500, 70),
    offsetX: clampNumber(source.offsetX, -500, 500, 0),
    offsetY: clampNumber(source.offsetY, -500, 500, 0)
  };
}

function sanitizeVvtState(payload) {
  if (!isPlainObject(payload) || payload.active === false) {
    return {
      active: false,
      updatedAt: new Date().toISOString()
    };
  }
  const dataUrl = sanitizeDataUrl(payload.image?.dataUrl || payload.imageDataUrl);
  if (!dataUrl) {
    return {
      active: false,
      updatedAt: new Date().toISOString()
    };
  }
  return {
    active: true,
    title: sanitizeText(payload.title, 140) || "Mapa VVT",
    pageName: sanitizeText(payload.pageName, 140) || "",
    image: {
      name: sanitizeText(payload.image?.name, 180) || "Mapa",
      type: sanitizeText(payload.image?.type, 80) || "",
      dataUrl
    },
    fogOfWar: sanitizeVvtFog(payload.fogOfWar),
    grid: sanitizeVvtGrid(payload.grid),
    updatedAt: sanitizeText(payload.updatedAt, 80) || new Date().toISOString()
  };
}

function localLanAddresses() {
  return listLocalAddresses().lanAddresses;
}

function generateSessionToken() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function normalizeStartOptions(optionsOrPort = DEFAULT_PORT) {
  if (isPlainObject(optionsOrPort)) {
    return {
      port: normalizePort(optionsOrPort.port),
      tokenEnabled: optionsOrPort.tokenEnabled !== false,
      sessionToken: sanitizeText(optionsOrPort.sessionToken, 64)
    };
  }
  return {
    port: normalizePort(optionsOrPort),
    tokenEnabled: false,
    sessionToken: ""
  };
}

function sendJson(socket, payload) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

async function websocketSelfTest(host, port, timeoutMs = 1200) {
  const url = `ws://${host}:${port}`;
  return new Promise((resolve) => {
    let settled = false;
    const socket = new WebSocket(url);
    const done = (ok, error = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch (_error) {
        // Ignore cleanup errors from a failed diagnostic socket.
      }
      resolve({ ok, url, error });
    };
    const timer = setTimeout(() => done(false, "Connection timed out."), timeoutMs);
    socket.once("open", () => done(true));
    socket.once("error", (error) => done(false, error?.message || "Connection failed."));
  });
}

class LiveSheetServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = null;
    this.players = new Map();
    this.tokenEnabled = false;
    this.sessionToken = "";
    this.vvtState = { active: false, updatedAt: new Date().toISOString() };
    this.selfTests = {
      local: null,
      tailscale: null
    };
  }

  isRunning() {
    return Boolean(this.server);
  }

  status(extra = {}) {
    const addresses = listLocalAddresses();
    const port = this.port || extra.port || DEFAULT_PORT;
    const recommendedAddress = addresses.tailscaleAddresses[0] || addresses.lanAddresses[0] || "";
    return {
      running: this.isRunning(),
      port: this.port,
      tailscaleAddresses: addresses.tailscaleAddresses,
      lanAddresses: addresses.lanAddresses,
      addresses: addresses.allAddresses,
      playerCount: [...this.players.values()].filter((player) => player.connected).length,
      recommendedConnectionMode: addresses.tailscaleAddresses.length ? "tailscale" : "lan",
      recommendedUrl: recommendedAddress ? `ws://${recommendedAddress}:${port}` : "",
      tokenEnabled: this.tokenEnabled,
      sessionToken: this.tokenEnabled ? this.sessionToken : "",
      selfTests: this.selfTests,
      ...extra
    };
  }

  playerSnapshot(player) {
    if (!player) return null;
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      data: player.data,
      connected: Boolean(player.connected),
      lastUpdate: player.lastUpdate,
      connectedAt: player.connectedAt,
      disconnectedAt: player.disconnectedAt || null,
      remoteAddress: player.remoteAddress || ""
    };
  }

  getPlayers() {
    return [...this.players.values()]
      .map((player) => this.playerSnapshot(player))
      .filter(Boolean)
      .sort((left, right) => String(left.playerName || "").localeCompare(String(right.playerName || ""), undefined, { sensitivity: "base" }));
  }

  emitStatus(extra = {}) {
    this.emit("server-status", this.status(extra));
  }

  async runSelfTests() {
    if (!this.server || !this.port) {
      this.selfTests = { local: null, tailscale: null };
      return this.selfTests;
    }
    const { tailscaleAddresses } = listLocalAddresses();
    const local = await websocketSelfTest("127.0.0.1", this.port);
    const tailscale = tailscaleAddresses[0]
      ? await websocketSelfTest(tailscaleAddresses[0], this.port)
      : null;
    this.selfTests = { local, tailscale };
    this.emitStatus();
    return this.selfTests;
  }

  async start(optionsOrPort = DEFAULT_PORT) {
    if (this.server) return this.status();

    const options = normalizeStartOptions(optionsOrPort);
    const nextPort = options.port;
    const server = new WebSocketServer({
      host: "0.0.0.0",
      port: nextPort,
      maxPayload: MAX_MESSAGE_BYTES
    });

    await new Promise((resolve, reject) => {
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };
      server.once("listening", onListening);
      server.once("error", onError);
    }).catch((error) => {
      try {
        server.close();
      } catch (_closeError) {
        // Ignore cleanup errors after a failed bind.
      }
      const code = error?.code === "EADDRINUSE" ? "EADDRINUSE" : "START_FAILED";
      const message = code === "EADDRINUSE"
        ? `El puerto ${nextPort} ya esta en uso. Elegi otro puerto.`
        : (error?.message || "No se pudo iniciar el host local.");
      const wrapped = new Error(message);
      wrapped.code = code;
      throw wrapped;
    });

    this.server = server;
    this.port = nextPort;
    this.tokenEnabled = Boolean(options.tokenEnabled);
    this.sessionToken = this.tokenEnabled ? (options.sessionToken || generateSessionToken()) : "";
    this.selfTests = { local: null, tailscale: null };
    server.on("connection", (socket, request) => this.handleConnection(socket, request));
    server.on("close", () => {
      if (this.server === server) {
        this.server = null;
        this.port = null;
        this.emitStatus();
      }
    });
    this.emitStatus();
    await this.runSelfTests();
    return this.status();
  }

  async stop() {
    if (!this.server) {
      this.emitStatus();
      return this.status();
    }

    const server = this.server;
    this.server = null;
    this.port = null;
    this.tokenEnabled = false;
    this.sessionToken = "";
    this.selfTests = { local: null, tailscale: null };
    for (const socket of server.clients || []) {
      if (socket.readyState !== WebSocket.CLOSED) {
        socket.terminate();
      }
    }
    for (const player of this.players.values()) {
      if (player.ws && player.ws.readyState !== WebSocket.CLOSED) {
        player.ws.terminate?.();
      }
      if (player.connected) {
        player.connected = false;
        player.disconnectedAt = new Date().toISOString();
        player.ws = null;
        this.emit("player-disconnected", this.playerSnapshot(player));
      }
    }

    await new Promise((resolve) => server.close(() => resolve())).catch(() => {});
    this.emitStatus();
    return this.status();
  }

  kickPlayer(playerId) {
    const normalizedId = sanitizePlayerId(playerId);
    const player = this.players.get(normalizedId);
    if (!player) return { ok: false, error: "Jugador no encontrado." };

    this.players.delete(normalizedId);
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.close(4000, "Kicked by DM");
    }
    this.emit("player-disconnected", { ...this.playerSnapshot(player), removed: true });
    this.emitStatus();
    return { ok: true };
  }

  updatePlayerSheet(playerId, patch) {
    const normalizedId = sanitizePlayerId(playerId);
    const sanitizedPatch = sanitizeSheetPatch(patch);
    if (!normalizedId) return { ok: false, error: "Jugador invalido." };
    if (!sanitizedPatch) return { ok: false, error: "Patch de planilla invalido." };
    const player = this.players.get(normalizedId);
    if (!player) return { ok: false, error: "Jugador no encontrado." };

    player.data = {
      ...(player.data || {}),
      ...sanitizedPatch
    };
    player.lastUpdate = new Date().toISOString();

    if (!player.connected || !player.ws || player.ws.readyState !== WebSocket.OPEN) {
      this.players.set(normalizedId, player);
      this.emit("player-updated", this.playerSnapshot(player));
      this.emitStatus();
      return { ok: false, error: "El jugador no esta conectado.", player: this.playerSnapshot(player) };
    }

    sendJson(player.ws, {
      version: 1,
      type: "dm:sheet:patch",
      patch: sanitizedPatch,
      serverTime: player.lastUpdate
    });
    this.players.set(normalizedId, player);
    this.emit("player-updated", this.playerSnapshot(player));
    this.emitStatus();
    return { ok: true, player: this.playerSnapshot(player) };
  }

  setVvtState(payload) {
    const state = sanitizeVvtState(payload);
    this.vvtState = state;
    this.broadcastToPlayers({
      version: 1,
      type: "dm:vvt:state",
      state
    });
    return { ok: true, state };
  }

  broadcastToPlayers(payload) {
    for (const player of this.players.values()) {
      if (player.connected && player.ws && player.ws.readyState === WebSocket.OPEN) {
        sendJson(player.ws, payload);
      }
    }
  }

  handleConnection(socket, request) {
    let activePlayerId = null;
    socket.on("message", (rawMessage, isBinary) => {
      if (isBinary) {
        socket.close(1003, "Solo se acepta JSON de texto.");
        return;
      }

      const text = rawMessage.toString("utf8");
      if (Buffer.byteLength(text, "utf8") > MAX_MESSAGE_BYTES) {
        socket.close(1009, "Mensaje demasiado grande.");
        return;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        socket.close(1007, "JSON invalido.");
        return;
      }

      const validated = this.validatePayload(payload);
      if (!validated.ok) {
        socket.close(1008, validated.error);
        return;
      }

      if (this.tokenEnabled && validated.sessionToken !== this.sessionToken) {
        socket.close(1008, "Token de sesion invalido.");
        return;
      }

      const now = new Date().toISOString();
      activePlayerId = validated.playerId;
      const previous = this.players.get(validated.playerId);
      if (previous?.ws && previous.ws !== socket && previous.ws.readyState === WebSocket.OPEN) {
        previous.ws.close(4001, "Nueva conexion del mismo jugador.");
      }

      const player = {
        playerId: validated.playerId,
        playerName: validated.playerName,
        data: validated.data || previous?.data || {},
        connected: true,
        connectedAt: previous?.connectedAt || now,
        disconnectedAt: null,
        lastUpdate: validated.messageType === "sheet:update" ? now : previous?.lastUpdate || null,
        remoteAddress: request?.socket?.remoteAddress || "",
        ws: socket
      };
      this.players.set(validated.playerId, player);
      if (validated.messageType === "player:hello") {
        sendJson(socket, {
          version: 1,
          type: "server:welcome",
          serverTime: now,
          recommendedMode: this.status().recommendedConnectionMode
        });
        if (this.vvtState?.active) {
          sendJson(socket, {
            version: 1,
            type: "dm:vvt:state",
            state: this.vvtState
          });
        }
      }
      if (validated.messageType !== "roll:event" || !previous || !previous.connected || previous.playerName !== validated.playerName) {
        this.emit("player-updated", this.playerSnapshot(player));
      }
      if (validated.messageType === "sheet:update") {
        sendJson(socket, {
          version: 1,
          type: "server:ack",
          receivedType: "sheet:update",
          serverTime: now
        });
      }
      if (validated.messageType === "roll:event") {
        this.emit("player-roll", {
          playerId: validated.playerId,
          playerName: validated.playerName,
          connected: true,
          remoteAddress: player.remoteAddress,
          ...validated.roll,
          receivedAt: now
        });
      }
      this.emitStatus();
    });

    socket.on("close", () => {
      if (!activePlayerId) return;
      const player = this.players.get(activePlayerId);
      if (!player || player.ws !== socket) return;
      player.connected = false;
      player.disconnectedAt = new Date().toISOString();
      player.ws = null;
      this.emit("player-disconnected", this.playerSnapshot(player));
      this.emitStatus();
    });

    socket.on("error", () => {
      socket.close();
    });
  }

  validatePayload(payload) {
    if (!isPlainObject(payload)) return { ok: false, error: "Payload invalido." };
    if (!["player:hello", "sheet:update", "roll:event"].includes(payload.type) || payload.version !== 1) {
      return { ok: false, error: "Tipo de mensaje no compatible." };
    }
    const playerId = sanitizePlayerId(payload.playerId);
    if (!playerId) return { ok: false, error: "Falta playerId." };
    if (payload.type === "sheet:update" && !isPlainObject(payload.data)) return { ok: false, error: "Falta data de planilla." };
    const roll = payload.type === "roll:event" ? sanitizeRollEvent(payload.roll) : null;
    if (payload.type === "roll:event" && !roll) return { ok: false, error: "Falta tirada." };
    return {
      ok: true,
      messageType: payload.type,
      playerId,
      playerName: sanitizeText(payload.playerName) || "Jugador",
      sessionToken: sanitizeText(payload.sessionToken, 128),
      data: payload.type === "sheet:update" ? payload.data : null,
      roll
    };
  }
}

module.exports = {
  DEFAULT_PORT,
  MAX_MESSAGE_BYTES,
  isTailscaleIpv4,
  isTailscaleInterfaceName,
  listLocalAddresses,
  localLanAddresses,
  sanitizeSheetPatch,
  websocketSelfTest,
  LiveSheetServer,
  liveSheetServer: new LiveSheetServer()
};

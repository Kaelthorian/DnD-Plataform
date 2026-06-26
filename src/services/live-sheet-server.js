const os = require("os");
const { EventEmitter } = require("events");
const { WebSocket, WebSocketServer } = require("ws");

const DEFAULT_PORT = 8787;
const MAX_MESSAGE_BYTES = 512 * 1024;
const MAX_NAME_LENGTH = 80;

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

function localLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter(Boolean);
}

class LiveSheetServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = null;
    this.players = new Map();
  }

  isRunning() {
    return Boolean(this.server);
  }

  status(extra = {}) {
    return {
      running: this.isRunning(),
      port: this.port,
      addresses: this.isRunning() ? localLanAddresses() : [],
      playerCount: [...this.players.values()].filter((player) => player.connected).length,
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

  async start(port = DEFAULT_PORT) {
    if (this.server) return this.status();

    const nextPort = normalizePort(port);
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
    server.on("connection", (socket, request) => this.handleConnection(socket, request));
    server.on("close", () => {
      if (this.server === server) {
        this.server = null;
        this.port = null;
        this.emitStatus();
      }
    });
    this.emitStatus();
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
    for (const player of this.players.values()) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.close(1001, "Host stopped");
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

      const now = new Date().toISOString();
      activePlayerId = validated.playerId;
      const previous = this.players.get(validated.playerId);
      if (previous?.ws && previous.ws !== socket && previous.ws.readyState === WebSocket.OPEN) {
        previous.ws.close(4001, "Nueva conexion del mismo jugador.");
      }

      const player = {
        playerId: validated.playerId,
        playerName: validated.playerName,
        data: validated.data,
        connected: true,
        connectedAt: previous?.connectedAt || now,
        disconnectedAt: null,
        lastUpdate: now,
        remoteAddress: request?.socket?.remoteAddress || "",
        ws: socket
      };
      this.players.set(validated.playerId, player);
      this.emit("player-updated", this.playerSnapshot(player));
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
    if (payload.type !== "sheet:update" || payload.version !== 1) return { ok: false, error: "Tipo de mensaje no compatible." };
    const playerId = sanitizePlayerId(payload.playerId);
    if (!playerId) return { ok: false, error: "Falta playerId." };
    if (!isPlainObject(payload.data)) return { ok: false, error: "Falta data de planilla." };
    return {
      ok: true,
      playerId,
      playerName: sanitizeText(payload.playerName) || "Jugador",
      data: payload.data
    };
  }
}

module.exports = {
  DEFAULT_PORT,
  MAX_MESSAGE_BYTES,
  LiveSheetServer,
  liveSheetServer: new LiveSheetServer()
};

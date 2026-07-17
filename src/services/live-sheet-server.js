const os = require("os");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const { WebSocket, WebSocketServer } = require("ws");

const DEFAULT_PORT = 8787;
const MAX_MESSAGE_BYTES = 512 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_ROLL_TEXT_LENGTH = 600;
const MAX_VTT_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DM_AUDIO_BYTES = 18 * 1024 * 1024;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_VTT_FOG_POINTS = 1200;
const MAX_VTT_TOKENS = 200;
const MAX_VTT_MARKERS = 200;
const MAX_VTT_PING_AGE_MS = 5000;
const MAX_HAND_QUEUE = 40;
const MAX_LIVE_STATUS_IDS = 48;
const VTT_ANONYMOUS_MONSTER_NAME = "???";

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

function sanitizeMultilineText(value, maxLength = 5000) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((line) => line.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
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

function sanitizeLiveStatusIds(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((statusId) => sanitizeText(statusId, 80).toLowerCase())
    .filter((statusId) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(statusId) && !seen.has(statusId) && seen.add(statusId))
    .slice(0, MAX_LIVE_STATUS_IDS);
}

function sanitizeLiveSheetData(data) {
  const sanitized = { ...(data || {}) };
  if (Object.prototype.hasOwnProperty.call(sanitized, "__liveStatuses")) {
    sanitized.__liveStatuses = sanitizeLiveStatusIds(sanitized.__liveStatuses);
  }
  return sanitized;
}

function sanitizeSheetPatch(patch) {
  if (!isPlainObject(patch)) return null;
  const sanitized = {};
  Object.entries(patch).forEach(([key, value]) => {
    const normalizedKey = sanitizeText(key, 120);
    if (!normalizedKey || normalizedKey === "__proto__" || normalizedKey === "constructor" || normalizedKey === "prototype") return;
    if (normalizedKey === "__liveStatuses") {
      sanitized[normalizedKey] = sanitizeLiveStatusIds(value);
      return;
    }
    if (typeof value === "boolean") {
      sanitized[normalizedKey] = value;
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[normalizedKey] = String(value);
      return;
    }
    if (typeof value === "string") sanitized[normalizedKey] = sanitizeMultilineText(value, 5000);
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
  if (Buffer.byteLength(text, "utf8") > MAX_VTT_IMAGE_BYTES) return "";
  return text;
}

function sanitizeAudioDataUrl(value) {
  const text = String(value || "");
  if (!/^data:audio\/(?:mpeg|mp3|wav|wave|ogg|opus|webm|mp4|aac|flac|x-wav);base64,/i.test(text)) return "";
  if (Buffer.byteLength(text, "utf8") > MAX_DM_AUDIO_BYTES) return "";
  return text;
}

function sanitizeYoutubeVideoId(value) {
  const videoId = sanitizeText(value, 32);
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : "";
}

function sanitizeVttFog(fog) {
  const source = isPlainObject(fog) ? fog : {};
  const revealed = Array.isArray(source.revealed)
    ? source.revealed.slice(-MAX_VTT_FOG_POINTS).map((point) => ({
      x: clampNumber(point?.x, 0, 1, 0),
      y: clampNumber(point?.y, 0, 1, 0),
      rx: clampNumber(point?.rx ?? point?.r, 0.001, 1, 0.06),
      ry: clampNumber(point?.ry ?? point?.r, 0.001, 1, 0.06),
      shape: point?.shape === "square" ? "square" : "circle",
      mode: point?.mode === "hide" ? "hide" : "reveal"
    }))
    : [];
  return {
    enabled: source.enabled !== false,
    brushSize: clampNumber(source.brushSize, 8, 360, 90),
    brushShape: source.brushShape === "square" ? "square" : "circle",
    revealed
  };
}

function sanitizeVttGrid(grid) {
  const source = isPlainObject(grid) ? grid : {};
  return {
    enabled: Boolean(source.enabled),
    cellWidth: clampNumber(source.cellWidth, 8, 500, 70),
    cellHeight: clampNumber(source.cellHeight, 8, 500, 70),
    offsetX: clampNumber(source.offsetX, -500, 500, 0),
    offsetY: clampNumber(source.offsetY, -500, 500, 0)
  };
}

function rollEventPayload(roll) {
  if (!roll) return null;
  return {
    playerId: sanitizePlayerId(roll.playerId),
    playerName: sanitizeText(roll.playerName) || "Jugador",
    title: sanitizeText(roll.title, 140) || "Tirada",
    result: sanitizeText(roll.result, 80),
    detail: sanitizeText(roll.detail, MAX_ROLL_TEXT_LENGTH),
    timestamp: sanitizeText(roll.timestamp, 40) || new Date().toISOString(),
    receivedAt: sanitizeText(roll.receivedAt, 40) || new Date().toISOString()
  };
}

function sanitizeVttViewport(viewport) {
  const source = isPlainObject(viewport) ? viewport : {};
  return {
    width: clampNumber(source.width, 1, 20000, 1),
    height: clampNumber(source.height, 1, 20000, 1)
  };
}

function monsterTokenSourceCandidates(monster) {
  const source = sanitizeText(monster?.source, 80);
  const aliases = {
    XMM: ["MM"],
    XPHB: ["MM"],
    MPMM: ["VGM", "MM"],
    MTF: ["VGM", "MM"]
  };
  return unique([source, ...(aliases[source] || [])]);
}

function monsterTokenNameCandidates(monster) {
  const name = sanitizeText(monster?.name, 140);
  if (!name) return [];
  return unique([
    name,
    name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim(),
    name.replace(/[/:]/g, "-")
  ]);
}

function sanitizeVttTokenImageRequest(token) {
  const monster = isPlainObject(token?.monster) ? token.monster : {};
  const sources = monsterTokenSourceCandidates(monster).slice(0, 6);
  const names = monsterTokenNameCandidates(monster).slice(0, 8);
  if (!sources.length || !names.length) return null;
  return { sources, names };
}

function sanitizeVttToken(token) {
  if (!isPlainObject(token)) return null;
  if (token.hidden || token.playerHidden) return null;
  const id = sanitizeText(token.id, 120) || crypto.randomUUID?.() || `token-${Date.now()}`;
  const kind = token.kind === "character" ? "character" : "monster";
  const identityHidden = kind === "monster" && Boolean(token.identityHidden || token.anonymous || token.hideIdentity);
  const nameHidden = kind === "monster" && Boolean(token.nameHidden || token.hideName);
  const name = identityHidden || nameHidden
    ? VTT_ANONYMOUS_MONSTER_NAME
    : sanitizeText(token.name || token.character?.name || token.monster?.name, 120);
  if (!name) return null;
  return {
    id,
    kind,
    name,
    x: clampNumber(token.x, 0, 20000, 0),
    y: clampNumber(token.y, 0, 20000, 0),
    size: clampNumber(token.size, 8, 500, 56),
    ac: identityHidden ? "" : sanitizeText(token.ac, 40),
    hpCurrent: identityHidden ? "" : sanitizeText(token.hpCurrent ?? token.hp, 40),
    hpMax: identityHidden ? "" : sanitizeText(token.hpMax, 40),
    initiative: identityHidden ? "" : sanitizeText(token.initiative, 40),
    image: identityHidden ? {
      name: "",
      type: "",
      dataUrl: ""
    } : {
      name: sanitizeText(token.image?.name, 180) || "",
      type: sanitizeText(token.image?.type, 80) || "",
      dataUrl: sanitizeDataUrl(token.image?.dataUrl)
    },
    imageUnchanged: Boolean(token.imageUnchanged),
    imageRequest: identityHidden ? null : sanitizeVttTokenImageRequest(token),
    identityHidden,
    nameHidden
  };
}

function sanitizeVttCombat(combat) {
  const source = isPlainObject(combat) ? combat : {};
  const participants = Array.isArray(source.participants)
    ? source.participants.slice(0, MAX_VTT_TOKENS).map(sanitizeVttToken).filter(Boolean)
    : [];
  const participantIds = new Set(participants.map((participant) => participant.id));
  const activeId = sanitizeText(source.activeId || source.activeTokenId, 120);
  return {
    active: source.active !== false && participants.length > 0,
    activeId: participantIds.has(activeId) ? activeId : "",
    round: Math.max(1, Math.min(9999, Math.floor(clampNumber(source.round, 1, 9999, 1)))),
    participants
  };
}

function sanitizeVttMarker(marker, index = 0) {
  if (!isPlainObject(marker)) return null;
  if (marker.hidden || marker.playerHidden) return null;
  const markerType = marker.markerType === "shape" || marker.kind === "shape" ? "shape" : "pin";
  const formType = ["cone", "square", "circle"].includes(marker.formType || marker.shapeType || marker.shape)
    ? (marker.formType || marker.shapeType || marker.shape)
    : "square";
  const icon = sanitizeText(marker.icon || marker.markerIcon || marker.symbol, 40).toLowerCase();
  const markerIcons = new Set(["marker", "shop", "tavern", "inn", "swords", "shield", "castle", "temple", "camp", "cave", "treasure", "danger", "quest", "portal"]);
  const pattern = sanitizeText(marker.pattern || marker.mask || marker.areaPattern, 80).toLowerCase();
  return {
    id: sanitizeText(marker.id, 120) || crypto.randomUUID?.() || `marker-${Date.now()}-${index}`,
    label: sanitizeText(marker.label || marker.name || `Marker ${index + 1}`, 120) || `Marker ${index + 1}`,
    markerType,
    formType,
    x: clampNumber(marker.x, 0, 20000, 0),
    y: clampNumber(marker.y, 0, 20000, 0),
    width: clampNumber(marker.width, 8, 2000, 120),
    height: clampNumber(marker.height, 8, 2000, 120),
    rotation: clampNumber(marker.rotation, 0, 360, 0),
    color: sanitizeText(marker.color, 40) || "amber",
    opacity: clampNumber(marker.opacity ?? marker.alpha ?? marker.fillOpacity, 0.08, 0.85, 0.32),
    pattern: markerType === "shape" ? (pattern || "none") : "none",
    icon: markerType === "pin" && markerIcons.has(icon) ? icon : "marker"
  };
}

function sanitizeVttPing(ping) {
  if (!isPlainObject(ping)) return null;
  return {
    id: sanitizeText(ping.id, 120) || crypto.randomUUID?.() || `ping-${Date.now()}`,
    x: clampNumber(ping.x, 0, 1, 0),
    y: clampNumber(ping.y, 0, 1, 0),
    color: sanitizeText(ping.color, 40) || "sky",
    createdAt: sanitizeText(ping.createdAt, 40) || new Date().toISOString()
  };
}

function sanitizeDmAudio(payload) {
  if (!isPlainObject(payload)) return null;
  const kind = sanitizeText(payload.kind || payload.audio?.kind, 32).toLowerCase();
  if (kind === "youtube") {
    const videoId = sanitizeYoutubeVideoId(payload.videoId || payload.audio?.videoId);
    if (!videoId) return null;
    return {
      id: sanitizeText(payload.id, 120) || crypto.randomUUID?.() || `audio-${Date.now()}`,
      name: sanitizeText(payload.name || payload.audio?.name, 140) || "YouTube audio",
      kind: "youtube",
      videoId,
      volume: clampNumber(payload.volume, 0, 1, 1),
      playedAt: sanitizeText(payload.playedAt, 80) || new Date().toISOString()
    };
  }
  const dataUrl = sanitizeAudioDataUrl(payload.dataUrl || payload.audio?.dataUrl);
  if (!dataUrl) return null;
  return {
    id: sanitizeText(payload.id, 120) || crypto.randomUUID?.() || `audio-${Date.now()}`,
    name: sanitizeText(payload.name || payload.audio?.name, 140) || "Audio",
    kind: "file",
    type: sanitizeText(payload.type || payload.audio?.type, 80) || "",
    dataUrl,
    volume: clampNumber(payload.volume, 0, 1, 1),
    playedAt: sanitizeText(payload.playedAt, 80) || new Date().toISOString()
  };
}

function sanitizeDmAudioControl(payload) {
  if (!isPlainObject(payload)) return null;
  const action = sanitizeText(payload.action, 40).toLowerCase();
  if (!["pause", "resume"].includes(action)) return null;
  return {
    id: sanitizeText(payload.id, 120),
    action,
    sentAt: sanitizeText(payload.sentAt, 80) || new Date().toISOString()
  };
}

function sanitizeHandRaised(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function sanitizeVttState(payload) {
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
    title: sanitizeText(payload.title, 140) || "Mapa VTT",
    pageName: sanitizeText(payload.pageName, 140) || "",
    image: {
      name: sanitizeText(payload.image?.name, 180) || "Mapa",
      type: sanitizeText(payload.image?.type, 80) || "",
      dataUrl
    },
    fogOfWar: sanitizeVttFog(payload.fogOfWar),
    grid: sanitizeVttGrid(payload.grid),
    tokens: Array.isArray(payload.tokens)
      ? payload.tokens.slice(0, MAX_VTT_TOKENS).map(sanitizeVttToken).filter(Boolean)
      : [],
    combat: sanitizeVttCombat(payload.combat),
    markers: Array.isArray(payload.markers)
      ? payload.markers.slice(0, MAX_VTT_MARKERS).map(sanitizeVttMarker).filter(Boolean)
      : [],
    sourceViewport: sanitizeVttViewport(payload.sourceViewport),
    updatedAt: sanitizeText(payload.updatedAt, 80) || new Date().toISOString()
  };
}

function sanitizeVttPatch(payload) {
  if (!isPlainObject(payload)) return null;
  if (payload.active === false) {
    return {
      active: false,
      updatedAt: new Date().toISOString()
    };
  }
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(payload, "title")) patch.title = sanitizeText(payload.title, 140) || "Mapa VTT";
  if (Object.prototype.hasOwnProperty.call(payload, "pageName")) patch.pageName = sanitizeText(payload.pageName, 140) || "";
  if (Object.prototype.hasOwnProperty.call(payload, "fogOfWar")) patch.fogOfWar = sanitizeVttFog(payload.fogOfWar);
  if (Object.prototype.hasOwnProperty.call(payload, "grid")) patch.grid = sanitizeVttGrid(payload.grid);
  if (Object.prototype.hasOwnProperty.call(payload, "tokens")) {
    patch.tokens = Array.isArray(payload.tokens)
      ? payload.tokens.slice(0, MAX_VTT_TOKENS).map(sanitizeVttToken).filter(Boolean)
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(payload, "combat")) patch.combat = sanitizeVttCombat(payload.combat);
  if (Object.prototype.hasOwnProperty.call(payload, "markers")) {
    patch.markers = Array.isArray(payload.markers)
      ? payload.markers.slice(0, MAX_VTT_MARKERS).map(sanitizeVttMarker).filter(Boolean)
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(payload, "sourceViewport")) patch.sourceViewport = sanitizeVttViewport(payload.sourceViewport);
  patch.updatedAt = sanitizeText(payload.updatedAt, 80) || new Date().toISOString();
  return Object.keys(patch).length > 1 ? patch : null;
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
    this.vttState = { active: false, updatedAt: new Date().toISOString() };
    this.raisedHands = new Map();
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

  getRaisedHands() {
    return [...this.raisedHands.values()]
      .slice(0, MAX_HAND_QUEUE)
      .map((entry, index) => ({
        ...entry,
        position: index + 1
      }));
  }

  emitHandQueue() {
    const raisedHands = this.getRaisedHands();
    this.emit("player-hand-queue", raisedHands);
    this.broadcastToPlayers({
      version: 1,
      type: "dm:hand:queue",
      raisedHands
    });
  }

  setPlayerHand(playerId, playerName, raised) {
    const normalizedId = sanitizePlayerId(playerId);
    if (!normalizedId) return { ok: false, error: "Jugador invalido." };
    const safeName = sanitizeText(playerName) || "Jugador";
    if (raised) {
      const existing = this.raisedHands.get(normalizedId);
      this.raisedHands.set(normalizedId, {
        playerId: normalizedId,
        playerName: safeName,
        raisedAt: existing?.raisedAt || new Date().toISOString()
      });
      while (this.raisedHands.size > MAX_HAND_QUEUE) {
        const oldestId = this.raisedHands.keys().next().value;
        if (!oldestId) break;
        this.raisedHands.delete(oldestId);
      }
    } else {
      this.raisedHands.delete(normalizedId);
    }
    this.emitHandQueue();
    return { ok: true, raisedHands: this.getRaisedHands() };
  }

  lowerPlayerHand(playerId) {
    const normalizedId = sanitizePlayerId(playerId);
    if (!normalizedId) return { ok: false, error: "Jugador invalido." };
    const removed = this.raisedHands.delete(normalizedId);
    const player = this.players.get(normalizedId);
    if (player?.connected && player.ws?.readyState === WebSocket.OPEN) {
      sendJson(player.ws, {
        version: 1,
        type: "dm:hand:state",
        raised: false,
        reason: "dm",
        raisedHands: this.getRaisedHands()
      });
    }
    if (removed) this.emitHandQueue();
    return { ok: true, raisedHands: this.getRaisedHands() };
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
    this.raisedHands.clear();
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
    this.emitHandQueue();

    await new Promise((resolve) => server.close(() => resolve())).catch(() => {});
    this.emitStatus();
    return this.status();
  }

  kickPlayer(playerId) {
    const normalizedId = sanitizePlayerId(playerId);
    const player = this.players.get(normalizedId);
    if (!player) return { ok: false, error: "Jugador no encontrado." };

    this.players.delete(normalizedId);
    this.raisedHands.delete(normalizedId);
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.close(4000, "Kicked by DM");
    }
    this.emit("player-disconnected", { ...this.playerSnapshot(player), removed: true });
    this.emitHandQueue();
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

  setVttState(payload) {
    const state = sanitizeVttState(payload);
    this.vttState = state;
    this.broadcastToPlayers({
      version: 1,
      type: "dm:vtt:state",
      state
    });
    return { ok: true, state };
  }

  patchVttState(payload) {
    const patch = sanitizeVttPatch(payload);
    if (!patch) return { ok: false, error: "Patch VTT invalido." };
    if (patch.active === false) return this.setVttState(patch);
    if (!this.vttState?.active || !this.vttState.image?.dataUrl) {
      return { ok: false, error: "No hay un mapa VTT activo para actualizar." };
    }
    const canonicalPatch = { ...patch };
    if (Array.isArray(patch.tokens)) {
      const previousTokens = new Map((this.vttState.tokens || []).map((token) => [token.id, token]));
      canonicalPatch.tokens = patch.tokens.map((token) => {
        const previous = previousTokens.get(token.id);
        if (!token.imageUnchanged || token.image?.dataUrl || !previous?.image?.dataUrl) return token;
        return { ...token, image: previous.image };
      });
    }
    if (Array.isArray(patch.combat?.participants)) {
      const previousParticipants = new Map((this.vttState.combat?.participants || []).map((participant) => [participant.id, participant]));
      canonicalPatch.combat = {
        ...patch.combat,
        participants: patch.combat.participants.map((participant) => {
          const previous = previousParticipants.get(participant.id);
          if (!participant.imageUnchanged || participant.image?.dataUrl || !previous?.image?.dataUrl) return participant;
          return { ...participant, image: previous.image };
        })
      };
    }
    this.vttState = {
      ...this.vttState,
      ...canonicalPatch,
      active: true,
      image: this.vttState.image
    };
    this.broadcastToPlayers({
      version: 1,
      type: "dm:vtt:patch",
      patch
    });
    return { ok: true, patch };
  }

  publishVttPing(payload) {
    const sanitizedPing = sanitizeVttPing(payload);
    if (!sanitizedPing) return { ok: false, error: "Falta ping de mapa." };
    const ping = {
      ...sanitizedPing,
      playerId: sanitizedPing.playerId || "dm",
      playerName: sanitizedPing.playerName || "DM",
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + MAX_VTT_PING_AGE_MS).toISOString()
    };
    this.broadcastToPlayers({
      version: 1,
      type: "dm:vtt:ping",
      ping
    });
    this.emit("vtt-ping", ping);
    return { ok: true, ping };
  }

  publishDmAudio(payload) {
    const audio = sanitizeDmAudio(payload);
    if (!audio) return { ok: false, error: "Audio invalido o demasiado grande." };
    this.broadcastToPlayers({
      version: 1,
      type: "dm:audio:play",
      audio
    });
    return { ok: true, audio: { ...audio, dataUrl: "" } };
  }

  publishDmAudioControl(payload) {
    const control = sanitizeDmAudioControl(payload);
    if (!control) return { ok: false, error: "Control de audio invalido." };
    this.broadcastToPlayers({
      version: 1,
      type: "dm:audio:control",
      control
    });
    return { ok: true, control };
  }

  broadcastToPlayers(payload, exceptPlayerId = "") {
    const excludedId = sanitizePlayerId(exceptPlayerId);
    for (const player of this.players.values()) {
      if (excludedId && player.playerId === excludedId) continue;
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
      const raisedHand = this.raisedHands.get(validated.playerId);
      if (raisedHand && raisedHand.playerName !== validated.playerName) {
        this.raisedHands.set(validated.playerId, {
          ...raisedHand,
          playerName: validated.playerName
        });
        this.emitHandQueue();
      }
      if (validated.messageType === "player:hello") {
        sendJson(socket, {
          version: 1,
          type: "server:welcome",
          serverTime: now,
          recommendedMode: this.status().recommendedConnectionMode
        });
        if (this.vttState?.active) {
          sendJson(socket, {
            version: 1,
            type: "dm:vtt:state",
            state: this.vttState
          });
        }
        sendJson(socket, {
          version: 1,
          type: "dm:hand:state",
          raised: this.raisedHands.has(validated.playerId),
          reason: "sync",
          raisedHands: this.getRaisedHands()
        });
      }
      if (
        !["roll:event", "vtt:ping", "player:hand"].includes(validated.messageType)
        || !previous
        || !previous.connected
        || previous.playerName !== validated.playerName
      ) {
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
        const roll = rollEventPayload({
          playerId: validated.playerId,
          playerName: validated.playerName,
          connected: true,
          remoteAddress: player.remoteAddress,
          ...validated.roll,
          receivedAt: now
        });
        this.broadcastToPlayers({
          version: 1,
          type: "player:roll",
          roll
        }, validated.playerId);
        this.emit("player-roll", {
          ...roll,
          connected: true,
          remoteAddress: player.remoteAddress
        });
      }
      if (validated.messageType === "vtt:ping") {
        const ping = {
          ...validated.ping,
          playerId: validated.playerId,
          playerName: validated.playerName,
          receivedAt: now,
          expiresAt: new Date(Date.now() + MAX_VTT_PING_AGE_MS).toISOString()
        };
        this.broadcastToPlayers({
          version: 1,
          type: "dm:vtt:ping",
          ping
        });
        this.emit("vtt-ping", ping);
      }
      if (validated.messageType === "player:hand") {
        const handResult = this.setPlayerHand(validated.playerId, validated.playerName, validated.handRaised);
        sendJson(socket, {
          version: 1,
          type: "dm:hand:state",
          raised: validated.handRaised,
          reason: "self",
          raisedHands: handResult.raisedHands
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
      this.raisedHands.delete(activePlayerId);
      this.emit("player-disconnected", this.playerSnapshot(player));
      this.emitHandQueue();
      this.emitStatus();
    });

    socket.on("error", () => {
      socket.close();
    });
  }

  validatePayload(payload) {
    if (!isPlainObject(payload)) return { ok: false, error: "Payload invalido." };
    if (!["player:hello", "sheet:update", "roll:event", "vtt:ping", "player:hand"].includes(payload.type) || payload.version !== 1) {
      return { ok: false, error: "Tipo de mensaje no compatible." };
    }
    const playerId = sanitizePlayerId(payload.playerId);
    if (!playerId) return { ok: false, error: "Falta playerId." };
    if (payload.type === "sheet:update" && !isPlainObject(payload.data)) return { ok: false, error: "Falta data de planilla." };
    const roll = payload.type === "roll:event" ? sanitizeRollEvent(payload.roll) : null;
    if (payload.type === "roll:event" && !roll) return { ok: false, error: "Falta tirada." };
    const ping = payload.type === "vtt:ping" ? sanitizeVttPing(payload.ping) : null;
    if (payload.type === "vtt:ping" && !ping) return { ok: false, error: "Falta ping de mapa." };
    return {
      ok: true,
      messageType: payload.type,
      playerId,
      playerName: sanitizeText(payload.playerName) || "Jugador",
      sessionToken: sanitizeText(payload.sessionToken, 128),
      data: payload.type === "sheet:update" ? sanitizeLiveSheetData(payload.data) : null,
      roll,
      ping,
      handRaised: payload.type === "player:hand" ? sanitizeHandRaised(payload.raised ?? payload.handRaised) : false
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

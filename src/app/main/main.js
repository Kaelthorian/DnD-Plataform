const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const dataLoader = require("../../services/data-loader");
const { liveSheetServer } = require("../../services/live-sheet-server");
const { ObsidianService } = require("../../services/obsidian-service");
const saveService = require("../../services/save-service");
const translationService = require("../../services/translation-service");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const platformBackgroundWatchers = new Map();
let scheduledPlatformBackgroundBroadcast = null;
let lastPlatformBackgroundUrl = null;
let obsidianService = null;

const WINDOW_ROUTES = {
  characterSheet: {
    fileName: "index.html",
    title: "Planilla DnD",
    backgroundColor: "#1f1812"
  },
  dmScreen: {
    fileName: "dm-screen.html",
    title: "DM Screen",
    backgroundColor: "#ffffff"
  }
};

function normalizeBasename(fileName) {
  return path.parse(String(fileName || "")).name.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(String(fileName || "")).toLowerCase());
}

function uniquePaths(paths) {
  return [...new Set((paths || []).filter(Boolean).map((value) => path.resolve(value)))];
}

function toFileUrl(filePath) {
  return filePath ? pathToFileURL(filePath).toString() : null;
}

function firstExistingPath(paths = []) {
  return paths.find((candidatePath) => fs.existsSync(candidatePath)) || null;
}

function getSheetBackgroundCandidatePaths() {
  return uniquePaths([
    path.join(process.cwd(), "Background.png"),
    path.join(path.dirname(app.getPath("exe")), "Background.png")
  ]);
}

function getPlatformBackgroundDirectoryCandidates() {
  return uniquePaths([
    path.join(process.cwd(), "src", "app", "renderer", "assets"),
    path.join(__dirname, "..", "renderer", "assets"),
    path.join(path.dirname(app.getPath("exe")), "assets")
  ]);
}

function scorePlatformBackgroundCandidate(candidate) {
  const normalized = normalizeBasename(candidate?.name);
  let score = 0;
  if (normalized.includes("background")) score += 8;
  if (normalized.includes("plataform") || normalized.includes("platform")) score += 6;
  if (normalized.includes("wallpaper") || normalized.includes("backdrop")) score += 3;
  return score;
}

function resolvePlatformBackgroundImagePath() {
  const candidates = [];
  getPlatformBackgroundDirectoryCandidates().forEach((directoryPath) => {
    if (!fs.existsSync(directoryPath)) return;
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isFile() || !isImageFile(entry.name)) return;
      const normalized = normalizeBasename(entry.name);
      if (normalized === "background") return;
      const filePath = path.join(directoryPath, entry.name);
      const stats = fs.statSync(filePath);
      candidates.push({
        name: entry.name,
        path: filePath,
        size: stats.size,
        score: scorePlatformBackgroundCandidate(entry)
      });
    });
  });
  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.size !== left.size) return right.size - left.size;
    return left.name.localeCompare(right.name);
  });
  return candidates[0]?.path || null;
}

function getPlatformBackgroundImageUrl() {
  return toFileUrl(resolvePlatformBackgroundImagePath());
}

function broadcastPlatformBackgroundChange() {
  scheduledPlatformBackgroundBroadcast = null;
  const nextUrl = getPlatformBackgroundImageUrl();
  if (nextUrl === lastPlatformBackgroundUrl) return;
  lastPlatformBackgroundUrl = nextUrl;
  BrowserWindow.getAllWindows().forEach((windowInstance) => {
    if (!windowInstance.isDestroyed()) windowInstance.webContents.send("platform-background:changed", nextUrl);
  });
}

function schedulePlatformBackgroundBroadcast() {
  if (scheduledPlatformBackgroundBroadcast) clearTimeout(scheduledPlatformBackgroundBroadcast);
  scheduledPlatformBackgroundBroadcast = setTimeout(broadcastPlatformBackgroundChange, 80);
}

function broadcastToRenderers(channel, payload) {
  BrowserWindow.getAllWindows().forEach((windowInstance) => {
    if (!windowInstance.isDestroyed()) windowInstance.webContents.send(channel, payload);
  });
}

function getObsidianService() {
  if (!obsidianService) {
    obsidianService = new ObsidianService({
      userDataPath: app.getPath("userData"),
      dialog,
      shell,
      onVaultChanged: (payload) => broadcastToRenderers("obsidian:vault-changed", payload)
    });
  }
  return obsidianService;
}

function ensurePlatformBackgroundWatchers() {
  getPlatformBackgroundDirectoryCandidates().forEach((directoryPath) => {
    if (platformBackgroundWatchers.has(directoryPath) || !fs.existsSync(directoryPath)) return;
    try {
      const watcher = fs.watch(directoryPath, { persistent: false }, () => {
        schedulePlatformBackgroundBroadcast();
      });
      watcher.on("error", () => {
        try {
          watcher.close();
        } catch (_error) {
          // Ignore watcher cleanup errors.
        }
        platformBackgroundWatchers.delete(directoryPath);
      });
      platformBackgroundWatchers.set(directoryPath, watcher);
    } catch (_error) {
      // Ignore watcher startup errors; the background still resolves on launch.
    }
  });
}

async function createWindow(routeName = "characterSheet") {
  const route = WINDOW_ROUTES[routeName] || WINDOW_ROUTES.characterSheet;
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1024,
    minHeight: 720,
    title: route.title,
    backgroundColor: route.backgroundColor,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenu(null);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`No se pudo cargar ${validatedURL}: ${errorCode} ${errorDescription}`);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`El renderer se cerro inesperadamente: ${details.reason}`);
  });

  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) console.error(`Renderer: ${message}`);
  });

  ensurePlatformBackgroundWatchers();
  lastPlatformBackgroundUrl = getPlatformBackgroundImageUrl();
  await win.loadFile(path.join(__dirname, "..", "renderer", route.fileName));
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  getObsidianService().refreshWatchers().catch(() => {});
  return createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("sheet:load", async () => {
  return saveService.loadSheet(app.getPath("userData"));
});

ipcMain.handle("sheet:save", async (_event, data) => {
  return saveService.saveSheet(app.getPath("userData"), data);
});

ipcMain.handle("sheet:clear", async () => {
  return saveService.clearSheet(app.getPath("userData"));
});

ipcMain.handle("sheet:store:load", async () => {
  return saveService.loadSaveStore(app.getPath("userData"));
});

ipcMain.handle("sheet:store:save", async (_event, store) => {
  return saveService.saveSaveStore(app.getPath("userData"), store);
});

ipcMain.handle("sheet:slot:clear", async (_event, slotId) => {
  return saveService.clearActiveSlot(app.getPath("userData"), slotId);
});

ipcMain.handle("app:navigate", async (event, target) => {
  const routeName = target === "dm-screen" ? "dmScreen" : "characterSheet";
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  const nextWindow = await createWindow(routeName);
  if (sourceWindow && !sourceWindow.isDestroyed() && sourceWindow.id !== nextWindow.id) {
    sourceWindow.close();
  }
  return { ok: true, target: routeName };
});

ipcMain.handle("pdf:load", async () => {
  return dataLoader.loadPdfBase64();
});

ipcMain.handle("background:image-url", async () => {
  return toFileUrl(firstExistingPath(getSheetBackgroundCandidatePaths()));
});

ipcMain.handle("platform-background:image-url", async () => {
  return getPlatformBackgroundImageUrl();
});

ipcMain.handle("obsidian:get-vault", async () => {
  return getObsidianService().getVault();
});

ipcMain.handle("obsidian:select-vault", async (event) => {
  return getObsidianService().selectVault(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle("obsidian:clear-vault", async () => {
  const result = await getObsidianService().clearVault();
  broadcastToRenderers("obsidian:vault-changed", { relativePath: "", changedAt: Date.now(), vaultCleared: true });
  return result;
});

ipcMain.handle("obsidian:list-notes", async (_event, query) => {
  return getObsidianService().listNotes(query);
});

ipcMain.handle("obsidian:read-note", async (_event, relativePath) => {
  return getObsidianService().readNote(relativePath);
});

ipcMain.handle("obsidian:write-note", async (_event, { relativePath, markdown } = {}) => {
  return getObsidianService().writeNote(relativePath, markdown);
});

ipcMain.handle("obsidian:open-note", async (_event, relativePath) => {
  return getObsidianService().openNote(relativePath);
});

ipcMain.handle("obsidian:get-asset-url", async (_event, relativePath) => {
  return getObsidianService().getAssetUrl(relativePath);
});

ipcMain.handle("races:load", async () => {
  return dataLoader.loadRaces();
});

ipcMain.handle("backgrounds:load", async () => {
  return dataLoader.loadBackgrounds();
});

ipcMain.handle("classes:load", async () => {
  return dataLoader.loadClasses();
});

ipcMain.handle("spells:load", async () => {
  return dataLoader.loadSpells();
});

ipcMain.handle("feats:load", async () => {
  return dataLoader.loadFeats();
});

ipcMain.handle("items:load", async () => {
  return dataLoader.loadItems();
});

ipcMain.handle("conditions-diseases:load", async () => {
  return dataLoader.loadConditionsDiseases();
});

ipcMain.handle("languages:load", async () => {
  return dataLoader.loadLanguages();
});

ipcMain.handle("translate:text", async (_event, { text, from = "en", to = "es" } = {}) => {
  const source = String(text || "").trim();
  if (!source) return "";
  return translationService.translateText(source, from, to);
});

ipcMain.handle("live-sheet:start", async (_event, port) => {
  try {
    const status = await liveSheetServer.start(port);
    return { ok: true, status };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "No se pudo iniciar el host local.",
      code: error?.code || "START_FAILED",
      status: liveSheetServer.status()
    };
  }
});

ipcMain.handle("live-sheet:stop", async () => {
  const status = await liveSheetServer.stop();
  return { ok: true, status };
});

ipcMain.handle("live-sheet:status", async () => {
  return liveSheetServer.status();
});

ipcMain.handle("live-sheet:get-players", async () => {
  return liveSheetServer.getPlayers();
});

ipcMain.handle("live-sheet:kick-player", async (_event, playerId) => {
  return liveSheetServer.kickPlayer(playerId);
});

liveSheetServer.on("player-updated", (player) => {
  broadcastToRenderers("live-sheet:player-updated", player);
});

liveSheetServer.on("player-disconnected", (player) => {
  broadcastToRenderers("live-sheet:player-disconnected", player);
});

liveSheetServer.on("player-roll", (roll) => {
  broadcastToRenderers("live-sheet:player-roll", roll);
});

liveSheetServer.on("server-status", (status) => {
  broadcastToRenderers("live-sheet:server-status", status);
});

app.on("before-quit", () => {
  liveSheetServer.stop().catch(() => {});
  obsidianService?.closeWatchers();
  platformBackgroundWatchers.forEach((watcher) => {
    try {
      watcher.close();
    } catch (_error) {
      // Ignore watcher cleanup errors.
    }
  });
  platformBackgroundWatchers.clear();
  if (scheduledPlatformBackgroundBroadcast) clearTimeout(scheduledPlatformBackgroundBroadcast);
});

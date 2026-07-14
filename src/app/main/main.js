const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require("electron");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

const dataLoader = require("../../services/data-loader");
const { liveSheetServer, listLocalAddresses } = require("../../services/live-sheet-server");
const { ObsidianService } = require("../../services/obsidian-service");
const saveService = require("../../services/save-service");
const { saveTokenLibraryImage } = require("../../services/token-library-service");
const translationService = require("../../services/translation-service");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const platformBackgroundWatchers = new Map();
let scheduledPlatformBackgroundBroadcast = null;
let lastPlatformBackgroundUrl = null;
let obsidianService = null;
let autoUpdaterConfigured = false;
let autoUpdaterState = {
  status: "idle",
  currentVersion: app.getVersion(),
  updateInfo: null,
  progress: null,
  error: null,
  canUpdate: false,
  reason: ""
};

function compactUpdateInfo(info) {
  if (!info) return null;
  return {
    version: info.version || "",
    releaseName: info.releaseName || "",
    releaseNotes: info.releaseNotes || "",
    releaseDate: info.releaseDate || "",
    files: Array.isArray(info.files) ? info.files.map((file) => ({
      url: file.url || "",
      size: file.size || 0
    })) : []
  };
}

function compactProgressInfo(progress) {
  if (!progress) return null;
  return {
    percent: Number.isFinite(progress.percent) ? progress.percent : 0,
    transferred: Number.isFinite(progress.transferred) ? progress.transferred : 0,
    total: Number.isFinite(progress.total) ? progress.total : 0,
    bytesPerSecond: Number.isFinite(progress.bytesPerSecond) ? progress.bytesPerSecond : 0
  };
}

function setAutoUpdaterState(patch) {
  autoUpdaterState = {
    ...autoUpdaterState,
    ...patch,
    currentVersion: app.getVersion(),
    canUpdate: Boolean(app.isPackaged)
  };
  broadcastToRenderers("updater:state", autoUpdaterState);
  return autoUpdaterState;
}

function updaterErrorMessage(error) {
  return error?.message || String(error || "Unknown updater error");
}

function isAllowedExternalUrl(value) {
  try {
    const protocol = new URL(String(value || "")).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch (_error) {
    return false;
  }
}

function configureAutoUpdater() {
  if (autoUpdaterConfigured) return autoUpdaterState;
  autoUpdaterConfigured = true;

  log.transports.file.level = "info";
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (!app.isPackaged) {
    return setAutoUpdaterState({
      status: "unavailable",
      reason: "Auto updates are only available in packaged builds."
    });
  }

  setAutoUpdaterState({ status: "idle", reason: "", error: null });

  autoUpdater.on("checking-for-update", () => {
    setAutoUpdaterState({ status: "checking", progress: null, error: null });
  });

  autoUpdater.on("update-available", (info) => {
    setAutoUpdaterState({
      status: "available",
      updateInfo: compactUpdateInfo(info),
      progress: null,
      error: null
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    setAutoUpdaterState({
      status: "up-to-date",
      updateInfo: compactUpdateInfo(info),
      progress: null,
      error: null
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    setAutoUpdaterState({
      status: "downloading",
      progress: compactProgressInfo(progress),
      error: null
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setAutoUpdaterState({
      status: "downloaded",
      updateInfo: compactUpdateInfo(info),
      progress: null,
      error: null
    });
  });

  autoUpdater.on("error", (error) => {
    log.error(error);
    setAutoUpdaterState({
      status: "error",
      progress: null,
      error: updaterErrorMessage(error)
    });
  });

  return autoUpdaterState;
}

async function checkForAppUpdates() {
  configureAutoUpdater();
  if (!app.isPackaged) return autoUpdaterState;
  if (autoUpdaterState.status === "checking" || autoUpdaterState.status === "downloading") return autoUpdaterState;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo && autoUpdaterState.status === "idle") {
      setAutoUpdaterState({ updateInfo: compactUpdateInfo(result.updateInfo) });
    }
  } catch (error) {
    log.error(error);
    setAutoUpdaterState({
      status: "error",
      progress: null,
      error: updaterErrorMessage(error)
    });
  }
  return autoUpdaterState;
}

async function downloadAppUpdate() {
  configureAutoUpdater();
  if (!app.isPackaged) return autoUpdaterState;
  if (autoUpdaterState.status !== "available") return autoUpdaterState;
  try {
    setAutoUpdaterState({ status: "downloading", progress: null, error: null });
    await autoUpdater.downloadUpdate();
  } catch (error) {
    log.error(error);
    setAutoUpdaterState({
      status: "error",
      progress: null,
      error: updaterErrorMessage(error)
    });
  }
  return autoUpdaterState;
}

function installDownloadedUpdate() {
  configureAutoUpdater();
  if (!app.isPackaged || autoUpdaterState.status !== "downloaded") return autoUpdaterState;
  setImmediate(() => {
    autoUpdater.quitAndInstall(true, true);
  });
  return setAutoUpdaterState({ status: "installing", error: null });
}

function safePathSegment(value, fallback) {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim() || fallback;
}

function configureChromiumStoragePaths() {
  const appDataRoot = process.env.LOCALAPPDATA || app.getPath("appData");
  const appFolder = safePathSegment(app.getName(), "DnD Character Sheet");
  const sessionDataPath = path.join(appDataRoot, appFolder, "SessionData");
  const cachePath = path.join(sessionDataPath, "Cache");
  const mediaCachePath = path.join(sessionDataPath, "MediaCache");
  try {
    fs.mkdirSync(cachePath, { recursive: true });
    fs.mkdirSync(mediaCachePath, { recursive: true });
    app.setPath("sessionData", sessionDataPath);
    app.commandLine.appendSwitch("disk-cache-dir", cachePath);
    app.commandLine.appendSwitch("media-cache-dir", mediaCachePath);
  } catch (error) {
    console.warn(`Could not configure the Electron cache: ${error?.message || error}`);
  }
}

configureChromiumStoragePaths();

const WINDOW_ROUTES = {
  characterSheet: {
    fileName: "index.html",
    title: "DnD Character Sheet",
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

function imageMimeType(filePath) {
  switch (path.extname(String(filePath || "")).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".png":
    default:
      return "image/png";
  }
}

function imageFileDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  return {
    name: path.basename(filePath),
    type: imageMimeType(filePath),
    dataUrl: `data:${imageMimeType(filePath)};base64,${data.toString("base64")}`
  };
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

function getMonsterTokenDirectoryCandidates() {
  return uniquePaths([
    path.join(app.getPath("userData"), "Tokens"),
    path.join(process.cwd(), "Tokens"),
    path.join(__dirname, "..", "..", "..", "Tokens"),
    path.join(process.resourcesPath || "", "app.asar", "Tokens"),
    path.join(path.dirname(app.getPath("exe")), "Tokens")
  ]);
}

function getWritableTokenDirectory() {
  const candidates = app.isPackaged
    ? [path.join(path.dirname(app.getPath("exe")), "Tokens"), path.join(app.getPath("userData"), "Tokens")]
    : [path.join(process.cwd(), "Tokens"), path.join(app.getPath("userData"), "Tokens")];
  for (const directoryPath of uniquePaths(candidates)) {
    try {
      fs.mkdirSync(directoryPath, { recursive: true });
      fs.accessSync(directoryPath, fs.constants.W_OK);
      return directoryPath;
    } catch (_error) {
      // Try the next approved token-library location.
    }
  }
  throw new Error("No se pudo acceder a la carpeta de imágenes de tokens.");
}

function normalizeTokenCandidate(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim();
}

function resolveMonsterTokenPath({ sources = [], names = [] } = {}) {
  const safeSources = [...new Set((Array.isArray(sources) ? sources : []).map(normalizeTokenCandidate).filter(Boolean))];
  const safeNames = [...new Set((Array.isArray(names) ? names : []).map(normalizeTokenCandidate).filter(Boolean))];
  const directories = getMonsterTokenDirectoryCandidates();
  for (const directoryPath of directories) {
    for (const source of safeSources) {
      for (const name of safeNames) {
        for (const extension of IMAGE_EXTENSIONS) {
          const tokenPath = path.join(directoryPath, source, `${name}${extension}`);
          if (fs.existsSync(tokenPath)) return tokenPath;
        }
      }
    }
    const defaultTokenPath = path.join(directoryPath, "default.png");
    if (fs.existsSync(defaultTokenPath)) return defaultTokenPath;
  }
  return null;
}

function listTokenLibrary() {
  const roots = getMonsterTokenDirectoryCandidates().filter((directoryPath) => fs.existsSync(directoryPath));
  const seenPaths = new Set();
  const tokens = [];
  const walk = (directoryPath, rootPath) => {
    let entries = [];
    try {
      entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    } catch (_error) {
      return;
    }
    entries.forEach((entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath, rootPath);
        return;
      }
      if (!entry.isFile() || !isImageFile(entry.name)) return;
      const resolvedPath = path.resolve(entryPath);
      if (seenPaths.has(resolvedPath)) return;
      seenPaths.add(resolvedPath);
      const relativePath = path.relative(rootPath, resolvedPath).replace(/\\/g, "/");
      const source = path.dirname(relativePath) === "." ? "" : path.dirname(relativePath).split("/")[0] || "";
      tokens.push({
        id: resolvedPath,
        name: path.parse(entry.name).name,
        fileName: entry.name,
        source,
        relativePath,
        url: toFileUrl(resolvedPath)
      });
    });
  };
  roots.forEach((rootPath) => walk(rootPath, rootPath));
  return tokens.sort((left, right) => (
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    || left.relativePath.localeCompare(right.relativePath, undefined, { sensitivity: "base" })
  ));
}

function tokenLibraryImageDataUrl(tokenId) {
  const targetPath = path.resolve(String(tokenId || ""));
  const allowedRoots = getMonsterTokenDirectoryCandidates().filter((directoryPath) => fs.existsSync(directoryPath));
  const isAllowed = allowedRoots.some((rootPath) => {
    const relative = path.relative(rootPath, targetPath);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
  if (!isAllowed || !isImageFile(targetPath)) return null;
  return imageFileDataUrl(targetPath);
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

function getTailscaleCliDiagnostic() {
  try {
    const ipResult = spawnSync("tailscale", ["ip", "-4"], {
      encoding: "utf8",
      timeout: 1800,
      windowsHide: true
    });
    if (ipResult.error) {
      return {
        available: false,
        error: ipResult.error.code === "ENOENT" ? "tailscale CLI not found in PATH." : ipResult.error.message
      };
    }
    const statusResult = spawnSync("tailscale", ["status"], {
      encoding: "utf8",
      timeout: 1800,
      windowsHide: true
    });
    return {
      available: true,
      ip4: String(ipResult.stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      status: String(statusResult.stdout || "").trim(),
      error: ipResult.status === 0 ? "" : (String(ipResult.stderr || "").trim() || `tailscale ip exited with ${ipResult.status}`)
    };
  } catch (error) {
    return {
      available: false,
      error: error?.message || "tailscale CLI diagnostic failed."
    };
  }
}

function getLiveSheetDiagnostics() {
  const addresses = listLocalAddresses();
  const firstTailscaleIp = addresses.tailscaleAddresses[0] || "";
  return {
    ...addresses,
    tailscaleDetected: Boolean(firstTailscaleIp),
    message: firstTailscaleIp
      ? `Tailscale IP detected: ${firstTailscaleIp}`
      : "No Tailscale IP detected. Open Tailscale and confirm this device is connected.",
    cli: getTailscaleCliDiagnostic()
  };
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
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url).catch((error) => log.warn(`Could not open external URL: ${updaterErrorMessage(error)}`));
    }
    return { action: "deny" };
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Could not load ${validatedURL}: ${errorCode} ${errorDescription}`);
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
  return createWindow().then(() => {
    configureAutoUpdater();
    if (app.isPackaged) {
      setTimeout(() => {
        checkForAppUpdates().catch((error) => log.error(error));
      }, 3000);
    }
  });
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

ipcMain.handle("updater:get-state", async () => {
  return configureAutoUpdater();
});

ipcMain.handle("updater:check", async () => {
  return checkForAppUpdates();
});

ipcMain.handle("updater:download", async () => {
  return downloadAppUpdate();
});

ipcMain.handle("updater:install", async () => {
  return installDownloadedUpdate();
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

ipcMain.handle("monster-token:image-url", async (_event, request) => {
  return toFileUrl(resolveMonsterTokenPath(request));
});

ipcMain.handle("monster-token:data-url", async (_event, request) => {
  return imageFileDataUrl(resolveMonsterTokenPath(request));
});

ipcMain.handle("token-library:list", async () => {
  return listTokenLibrary();
});

ipcMain.handle("token-library:data-url", async (_event, tokenId) => {
  return tokenLibraryImageDataUrl(tokenId);
});

ipcMain.handle("token-library:save", async (_event, image) => {
  const saved = saveTokenLibraryImage({
    directoryPath: getWritableTokenDirectory(),
    name: image?.name,
    dataUrl: image?.dataUrl
  });
  const storedImage = imageFileDataUrl(saved.filePath);
  if (!storedImage) throw new Error("No se pudo leer la imagen de token guardada.");
  BrowserWindow.getAllWindows().forEach((windowInstance) => {
    if (!windowInstance.isDestroyed()) windowInstance.webContents.send("token-library:changed");
  });
  return {
    ...storedImage,
    id: saved.filePath,
    fileName: saved.fileName,
    url: toFileUrl(saved.filePath)
  };
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

ipcMain.handle("live-sheet:start", async (_event, options) => {
  try {
    const status = await liveSheetServer.start(options);
    return { ok: true, status };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Could not start the local host.",
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

ipcMain.handle("live-sheet:diagnostics", async () => {
  return getLiveSheetDiagnostics();
});

ipcMain.handle("live-sheet:self-test", async () => {
  const selfTests = await liveSheetServer.runSelfTests();
  return { ok: true, status: liveSheetServer.status({ selfTests }) };
});

ipcMain.handle("live-sheet:get-players", async () => {
  return liveSheetServer.getPlayers();
});

ipcMain.handle("live-sheet:kick-player", async (_event, playerId) => {
  return liveSheetServer.kickPlayer(playerId);
});

ipcMain.handle("live-sheet:get-raised-hands", async () => {
  return liveSheetServer.getRaisedHands();
});

ipcMain.handle("live-sheet:lower-player-hand", async (_event, playerId) => {
  return liveSheetServer.lowerPlayerHand(playerId);
});

ipcMain.handle("live-sheet:update-player-sheet", async (_event, { playerId, patch } = {}) => {
  return liveSheetServer.updatePlayerSheet(playerId, patch);
});

ipcMain.handle("live-sheet:publish-vtt-state", async (_event, state) => {
  return liveSheetServer.setVttState(state);
});

ipcMain.handle("live-sheet:publish-vtt-patch", async (_event, patch) => {
  return liveSheetServer.patchVttState(patch);
});

ipcMain.handle("live-sheet:publish-vtt-ping", async (_event, ping) => {
  return liveSheetServer.publishVttPing(ping);
});

ipcMain.handle("live-sheet:publish-dm-audio", async (_event, audio) => {
  return liveSheetServer.publishDmAudio(audio);
});

ipcMain.handle("live-sheet:publish-dm-audio-control", async (_event, control) => {
  return liveSheetServer.publishDmAudioControl(control);
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

liveSheetServer.on("vtt-ping", (ping) => {
  broadcastToRenderers("live-sheet:vtt-ping", ping);
});

liveSheetServer.on("player-hand-queue", (raisedHands) => {
  broadcastToRenderers("live-sheet:player-hand-queue", raisedHands);
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

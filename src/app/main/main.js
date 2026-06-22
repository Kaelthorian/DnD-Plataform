const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

const dataLoader = require("../../services/data-loader");
const saveService = require("../../services/save-service");
const translationService = require("../../services/translation-service");

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1024,
    minHeight: 720,
    title: "Planilla DnD",
    backgroundColor: "#1f1812",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

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

  await win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(createWindow);

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

ipcMain.handle("pdf:load", async () => {
  return dataLoader.loadPdfBase64();
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

ipcMain.handle("languages:load", async () => {
  return dataLoader.loadLanguages();
});

ipcMain.handle("translate:text", async (_event, { text, from = "en", to = "es" } = {}) => {
  const source = String(text || "").trim();
  if (!source) return "";
  return translationService.translateText(source, from, to);
});

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");

function dataFilePath() {
  return path.join(app.getPath("userData"), "character-sheet.json");
}

function pdfFilePath() {
  return path.join(__dirname, "DnD_5E_CharacterSheet_FormFillable.pdf");
}

function racesFilePath() {
  return path.join(__dirname, "races.json");
}

function backgroundsFilePath() {
  return path.join(__dirname, "backgrounds.json");
}

function classesFilePath() {
  return path.join(__dirname, "classes.json");
}

function spellsFilePath() {
  return path.join(__dirname, "spells.json");
}

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
      preload: path.join(__dirname, "preload.js"),
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

  await win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("sheet:load", async () => {
  try {
    const raw = await fs.readFile(dataFilePath(), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
});

ipcMain.handle("sheet:save", async (_event, data) => {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(dataFilePath(), JSON.stringify(data, null, 2), "utf8");
  return { savedAt: new Date().toISOString(), path: dataFilePath() };
});

ipcMain.handle("sheet:clear", async () => {
  try {
    await fs.rm(dataFilePath(), { force: true });
  } catch {
    return false;
  }
  return true;
});

ipcMain.handle("pdf:load", async () => {
  const pdf = await fs.readFile(pdfFilePath());
  return pdf.toString("base64");
});

ipcMain.handle("races:load", async () => {
  const raw = await fs.readFile(racesFilePath(), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("backgrounds:load", async () => {
  const raw = await fs.readFile(backgroundsFilePath(), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("classes:load", async () => {
  const raw = await fs.readFile(classesFilePath(), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("spells:load", async () => {
  const raw = await fs.readFile(spellsFilePath(), "utf8");
  return JSON.parse(raw);
});

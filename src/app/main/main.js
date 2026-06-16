const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const https = require("https");
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

function featsFilePath() {
  return path.join(__dirname, "5etools-src-main", "data", "feats.json");
}

function itemsFilePath() {
  return path.join(__dirname, "5etools-src-main", "data", "items.json");
}

function baseItemsFilePath() {
  return path.join(__dirname, "5etools-src-main", "data", "items-base.json");
}

function languagesFilePath() {
  return path.join(__dirname, "5etools-src-main", "data", "languages.json");
}

function splitTextForTranslation(text, maxLength = 450) {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  sentences.forEach((sentence) => {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength));
      }
      return;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(text, from, to) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`
  });
  const data = await getJson(`https://api.mymemory.translated.net/get?${params.toString()}`);
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("Translation response was empty");
  return translated;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Translation request failed (${response.statusCode})`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
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

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`No se pudo cargar ${validatedURL}: ${errorCode} ${errorDescription}`);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`El renderer se cerro inesperadamente: ${details.reason}`);
  });

  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) console.error(`Renderer: ${message}`);
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

ipcMain.handle("feats:load", async () => {
  const raw = await fs.readFile(featsFilePath(), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("items:load", async () => {
  const [itemsRaw, baseItemsRaw] = await Promise.all([
    fs.readFile(itemsFilePath(), "utf8"),
    fs.readFile(baseItemsFilePath(), "utf8")
  ]);
  return {
    items: JSON.parse(itemsRaw),
    baseItems: JSON.parse(baseItemsRaw)
  };
});

ipcMain.handle("languages:load", async () => {
  const raw = await fs.readFile(languagesFilePath(), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("translate:text", async (_event, { text, from = "en", to = "es" } = {}) => {
  const source = String(text || "").trim();
  if (!source) return "";
  const chunks = splitTextForTranslation(source);
  const translated = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, from, to));
  }
  return translated.join("\n\n");
});

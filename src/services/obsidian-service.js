const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { pathToFileURL } = require("url");

const CONFIG_FILE_NAME = "obsidian-vault-config.json";
const EXCLUDED_DIRS = new Set([".obsidian", ".trash", "node_modules", ".git"]);
const SAFE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

class ObsidianServiceError extends Error {
  constructor(message, code = "OBSIDIAN_ERROR") {
    super(message);
    this.name = "ObsidianServiceError";
    this.code = code;
  }
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slashPath(value) {
  return String(value || "").split(path.sep).join("/");
}

function isPathInside(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function extractNoteTitle(markdown, fallback) {
  const heading = String(markdown || "").match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function extractExcerpt(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ")
    .slice(0, 240);
}

class ObsidianService {
  constructor({ userDataPath, dialog = null, shell = null, onVaultChanged = null } = {}) {
    if (!userDataPath) throw new ObsidianServiceError("Missing userData path.", "CONFIG_UNAVAILABLE");
    this.userDataPath = userDataPath;
    this.dialog = dialog;
    this.shell = shell;
    this.onVaultChanged = onVaultChanged;
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);
    this.watchers = new Map();
    this.watchDebounce = null;
  }

  async getVault() {
    const config = await this.readConfig();
    if (!config.vaultPath) return { configured: false, path: "", name: "", exists: false };
    const vaultPath = path.resolve(config.vaultPath);
    return {
      configured: true,
      path: vaultPath,
      name: path.basename(vaultPath),
      exists: fs.existsSync(vaultPath)
    };
  }

  async selectVault(parentWindow = null) {
    if (!this.dialog?.showOpenDialog) {
      throw new ObsidianServiceError("Folder picker is unavailable.", "DIALOG_UNAVAILABLE");
    }
    const result = await this.dialog.showOpenDialog(parentWindow, {
      title: "Select Obsidian vault",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths?.[0]) return this.getVault();
    return this.setVaultPath(result.filePaths[0]);
  }

  async setVaultPath(vaultPath) {
    const resolved = path.resolve(String(vaultPath || ""));
    let stats;
    try {
      stats = await fsp.stat(resolved);
    } catch (_error) {
      throw new ObsidianServiceError("Vault path does not exist.", "VAULT_NOT_FOUND");
    }
    if (!stats.isDirectory()) throw new ObsidianServiceError("Selected vault is not a folder.", "INVALID_VAULT");
    await fsp.mkdir(this.userDataPath, { recursive: true });
    await fsp.writeFile(this.configPath, JSON.stringify({ vaultPath: resolved }, null, 2), "utf8");
    await this.refreshWatchers();
    return this.getVault();
  }

  async clearVault() {
    this.closeWatchers();
    try {
      await fsp.rm(this.configPath, { force: true });
    } catch (_error) {
      // Nothing to clear.
    }
    return this.getVault();
  }

  async listNotes(query = "") {
    const vaultPath = await this.requireVaultPath();
    const notes = await this.scanDirectory(vaultPath, vaultPath);
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return notes.sort(compareNotes);
    return notes
      .filter((note) => normalizeSearch([
        note.title,
        note.fileName,
        note.relativePath,
        note.excerpt
      ].join(" ")).includes(normalizedQuery))
      .sort(compareNotes);
  }

  async readNote(relativePath) {
    const vaultPath = await this.requireVaultPath();
    const filePath = await this.resolveVaultPath(relativePath, { allowedExtensions: [".md"], mustExist: true });
    let markdown;
    let stats;
    try {
      [markdown, stats] = await Promise.all([
        fsp.readFile(filePath, "utf8"),
        fsp.stat(filePath)
      ]);
    } catch (error) {
      throw new ObsidianServiceError(error?.code === "ENOENT" ? "Note could not be found." : "Could not read note.", error?.code || "READ_FAILED");
    }
    const fileName = path.basename(filePath);
    return {
      relativePath: slashPath(path.relative(vaultPath, filePath)),
      fileName,
      title: extractNoteTitle(markdown, path.basename(fileName, ".md")),
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      markdown
    };
  }

  async writeNote(relativePath, markdown) {
    const vaultPath = await this.requireVaultPath();
    const filePath = await this.resolveVaultPath(relativePath, { allowedExtensions: [".md"], mustExist: true });
    const nextMarkdown = String(markdown ?? "");
    try {
      await fsp.writeFile(filePath, nextMarkdown, "utf8");
      const stats = await fsp.stat(filePath);
      const fileName = path.basename(filePath);
      const payload = {
        relativePath: slashPath(path.relative(vaultPath, filePath)),
        fileName,
        title: extractNoteTitle(nextMarkdown, path.basename(fileName, ".md")),
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        markdown: nextMarkdown
      };
      this.scheduleVaultChanged(payload.relativePath);
      return payload;
    } catch (error) {
      throw new ObsidianServiceError(error?.message || "Could not write note.", error?.code || "WRITE_FAILED");
    }
  }

  async openNote(relativePath) {
    if (!this.shell?.openExternal) {
      throw new ObsidianServiceError("Open external URL is unavailable.", "SHELL_UNAVAILABLE");
    }
    const vault = await this.getVault();
    if (!vault.configured || !vault.exists) throw new ObsidianServiceError("No Obsidian vault selected.", "NO_VAULT");
    const filePath = await this.resolveVaultPath(relativePath, { allowedExtensions: [".md"], mustExist: true });
    const safeRelativePath = slashPath(path.relative(vault.path, filePath));
    const uri = `obsidian://open?vault=${encodeURIComponent(vault.name)}&file=${encodeURIComponent(safeRelativePath)}`;
    try {
      await this.shell.openExternal(uri);
      return { ok: true };
    } catch (error) {
      throw new ObsidianServiceError(error?.message || "Obsidian could not be opened.", "OPEN_FAILED");
    }
  }

  async getAssetUrl(relativePath) {
    const filePath = await this.resolveVaultPath(relativePath, { allowedExtensions: [...SAFE_IMAGE_EXTENSIONS], mustExist: true });
    return pathToFileURL(filePath).toString();
  }

  async refreshWatchers() {
    this.closeWatchers();
    const vault = await this.getVault();
    if (!vault.configured || !vault.exists) return;
    await this.watchDirectory(vault.path);
  }

  closeWatchers() {
    this.watchers.forEach((watcher) => {
      try {
        watcher.close();
      } catch (_error) {
        // Ignore watcher cleanup errors.
      }
    });
    this.watchers.clear();
    if (this.watchDebounce) clearTimeout(this.watchDebounce);
    this.watchDebounce = null;
  }

  async readConfig() {
    try {
      return JSON.parse(await fsp.readFile(this.configPath, "utf8")) || {};
    } catch (_error) {
      return {};
    }
  }

  async requireVaultPath() {
    const vault = await this.getVault();
    if (!vault.configured) throw new ObsidianServiceError("No Obsidian vault selected.", "NO_VAULT");
    if (!vault.exists) throw new ObsidianServiceError("Selected Obsidian vault no longer exists.", "VAULT_NOT_FOUND");
    return vault.path;
  }

  async resolveVaultPath(relativePath, { allowedExtensions = null, mustExist = false } = {}) {
    const vaultPath = await this.requireVaultPath();
    const requestedPath = String(relativePath || "").replace(/[\\/]+/g, path.sep);
    if (!requestedPath || path.isAbsolute(requestedPath)) {
      throw new ObsidianServiceError("Invalid vault-relative path.", "INVALID_PATH");
    }
    const resolved = path.resolve(vaultPath, requestedPath);
    if (!isPathInside(vaultPath, resolved)) {
      throw new ObsidianServiceError("Path escapes the selected vault.", "INVALID_PATH");
    }
    const extension = path.extname(resolved).toLowerCase();
    if (allowedExtensions && !allowedExtensions.includes(extension)) {
      throw new ObsidianServiceError("File type is not allowed.", "UNSUPPORTED_FILE_TYPE");
    }
    if (mustExist) {
      try {
        const [realVaultPath, realFilePath] = await Promise.all([
          fsp.realpath(vaultPath),
          fsp.realpath(resolved)
        ]);
        if (!isPathInside(realVaultPath, realFilePath)) {
          throw new ObsidianServiceError("Path escapes the selected vault.", "INVALID_PATH");
        }
        const stats = await fsp.stat(resolved);
        if (!stats.isFile()) throw new ObsidianServiceError("Path is not a file.", "INVALID_PATH");
      } catch (error) {
        if (error instanceof ObsidianServiceError) throw error;
        throw new ObsidianServiceError("File could not be found.", "FILE_NOT_FOUND");
      }
    }
    return resolved;
  }

  async scanDirectory(directoryPath, vaultPath) {
    let entries;
    try {
      entries = await fsp.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      throw new ObsidianServiceError(error?.message || "Could not scan vault.", error?.code || "SCAN_FAILED");
    }

    const notes = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        notes.push(...await this.scanDirectory(path.join(directoryPath, entry.name), vaultPath));
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") continue;
      const filePath = path.join(directoryPath, entry.name);
      if (!isPathInside(vaultPath, filePath)) continue;
      try {
        const [stats, markdown] = await Promise.all([
          fsp.stat(filePath),
          fsp.readFile(filePath, "utf8")
        ]);
        notes.push({
          relativePath: slashPath(path.relative(vaultPath, filePath)),
          fileName: entry.name,
          title: extractNoteTitle(markdown, path.basename(entry.name, ".md")),
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          excerpt: extractExcerpt(markdown)
        });
      } catch (_error) {
        // Skip unreadable notes in list results; direct reads report the error.
      }
    }
    return notes;
  }

  async watchDirectory(directoryPath) {
    if (this.watchers.has(directoryPath)) return;
    let entries = [];
    try {
      entries = await fsp.readdir(directoryPath, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    try {
      const watcher = fs.watch(directoryPath, { persistent: false }, (_event, fileName) => {
        const changedName = String(fileName || "");
        if (!changedName || path.extname(changedName).toLowerCase() === ".md") {
          this.scheduleVaultChanged(changedName ? slashPath(path.relative((this.cachedVaultPath || directoryPath), path.join(directoryPath, changedName))) : "");
        }
      });
      watcher.on("error", () => {
        this.watchers.delete(directoryPath);
        try {
          watcher.close();
        } catch (_error) {
          // Ignore watcher cleanup errors.
        }
      });
      this.watchers.set(directoryPath, watcher);
    } catch (_error) {
      return;
    }

    const vault = await this.getVault();
    this.cachedVaultPath = vault.path;
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        await this.watchDirectory(path.join(directoryPath, entry.name));
      }
    }
  }

  scheduleVaultChanged(relativePath) {
    if (this.watchDebounce) clearTimeout(this.watchDebounce);
    this.watchDebounce = setTimeout(() => {
      this.watchDebounce = null;
      this.onVaultChanged?.({ relativePath, changedAt: Date.now() });
    }, 120);
  }
}

function compareNotes(left, right) {
  return String(left.title || left.fileName).localeCompare(String(right.title || right.fileName), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

module.exports = {
  ObsidianService,
  ObsidianServiceError,
  EXCLUDED_DIRS,
  SAFE_IMAGE_EXTENSIONS,
  isPathInside
};

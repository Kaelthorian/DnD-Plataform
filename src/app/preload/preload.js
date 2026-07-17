const { contextBridge, ipcRenderer } = require("electron");

function onRendererEvent(channel, callback) {
  if (typeof callback !== "function") return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("dndSheet", {
  load: () => ipcRenderer.invoke("sheet:load"),
  save: (data) => ipcRenderer.invoke("sheet:save", data),
  clear: () => ipcRenderer.invoke("sheet:clear"),
  loadStore: () => ipcRenderer.invoke("sheet:store:load"),
  saveStore: (store) => ipcRenderer.invoke("sheet:store:save", store),
  clearSlot: (slotId) => ipcRenderer.invoke("sheet:slot:clear", slotId),
  loadDmSoundLinks: () => ipcRenderer.invoke("dm-sound-links:load"),
  saveDmSoundLinks: (links) => ipcRenderer.invoke("dm-sound-links:save", links),
  openDmScreen: () => ipcRenderer.invoke("app:navigate", "dm-screen"),
  openCharacterSheet: () => ipcRenderer.invoke("app:navigate", "character-sheet"),
  updater: {
    getState: () => ipcRenderer.invoke("updater:get-state"),
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onStateChanged: (callback) => onRendererEvent("updater:state", callback)
  },
  loadPdf: () => ipcRenderer.invoke("pdf:load"),
  getBackgroundImageUrl: () => ipcRenderer.invoke("background:image-url"),
  getPlatformBackgroundImageUrl: () => ipcRenderer.invoke("platform-background:image-url"),
  getMonsterTokenUrl: (request) => ipcRenderer.invoke("monster-token:image-url", request),
  getMonsterTokenDataUrl: (request) => ipcRenderer.invoke("monster-token:data-url", request),
  listTokenLibrary: () => ipcRenderer.invoke("token-library:list"),
  getTokenLibraryImage: (tokenId) => ipcRenderer.invoke("token-library:data-url", tokenId),
  saveTokenLibraryImage: (image) => ipcRenderer.invoke("token-library:save", image),
  onTokenLibraryChanged: (callback) => onRendererEvent("token-library:changed", callback),
  onPlatformBackgroundChanged: (callback) => {
    return onRendererEvent("platform-background:changed", callback);
  },
  loadRaces: () => ipcRenderer.invoke("races:load"),
  loadBackgrounds: () => ipcRenderer.invoke("backgrounds:load"),
  loadClasses: () => ipcRenderer.invoke("classes:load"),
  loadSpells: () => ipcRenderer.invoke("spells:load"),
  loadFeats: () => ipcRenderer.invoke("feats:load"),
  loadItems: () => ipcRenderer.invoke("items:load"),
  loadConditionsDiseases: () => ipcRenderer.invoke("conditions-diseases:load"),
  loadLanguages: () => ipcRenderer.invoke("languages:load"),
  translateText: (text, from = "en", to = "es") => ipcRenderer.invoke("translate:text", { text, from, to }),
  liveSheet: {
    startServer: (port) => ipcRenderer.invoke("live-sheet:start", port),
    stopServer: () => ipcRenderer.invoke("live-sheet:stop"),
    getStatus: () => ipcRenderer.invoke("live-sheet:status"),
    getDiagnostics: () => ipcRenderer.invoke("live-sheet:diagnostics"),
    runSelfTest: () => ipcRenderer.invoke("live-sheet:self-test"),
    getPlayers: () => ipcRenderer.invoke("live-sheet:get-players"),
    kickPlayer: (playerId) => ipcRenderer.invoke("live-sheet:kick-player", playerId),
    getRaisedHands: () => ipcRenderer.invoke("live-sheet:get-raised-hands"),
    lowerPlayerHand: (playerId) => ipcRenderer.invoke("live-sheet:lower-player-hand", playerId),
    updatePlayerSheet: (playerId, patch) => ipcRenderer.invoke("live-sheet:update-player-sheet", { playerId, patch }),
    publishVttState: (state) => ipcRenderer.invoke("live-sheet:publish-vtt-state", state),
    publishVttPatch: (patch) => ipcRenderer.invoke("live-sheet:publish-vtt-patch", patch),
    publishVttPing: (ping) => ipcRenderer.invoke("live-sheet:publish-vtt-ping", ping),
    publishDmAudio: (audio) => ipcRenderer.invoke("live-sheet:publish-dm-audio", audio),
    publishDmAudioControl: (control) => ipcRenderer.invoke("live-sheet:publish-dm-audio-control", control),
    onPlayerUpdated: (callback) => onRendererEvent("live-sheet:player-updated", callback),
    onPlayerDisconnected: (callback) => onRendererEvent("live-sheet:player-disconnected", callback),
    onPlayerRoll: (callback) => onRendererEvent("live-sheet:player-roll", callback),
    onVttPing: (callback) => onRendererEvent("live-sheet:vtt-ping", callback),
    onPlayerHandQueue: (callback) => onRendererEvent("live-sheet:player-hand-queue", callback),
    onServerStatus: (callback) => onRendererEvent("live-sheet:server-status", callback)
  },
  obsidian: {
    getVault: () => ipcRenderer.invoke("obsidian:get-vault"),
    selectVault: () => ipcRenderer.invoke("obsidian:select-vault"),
    clearVault: () => ipcRenderer.invoke("obsidian:clear-vault"),
    listNotes: (query) => ipcRenderer.invoke("obsidian:list-notes", query),
    readNote: (relativePath) => ipcRenderer.invoke("obsidian:read-note", relativePath),
    writeNote: (relativePath, markdown) => ipcRenderer.invoke("obsidian:write-note", { relativePath, markdown }),
    openNote: (relativePath) => ipcRenderer.invoke("obsidian:open-note", relativePath),
    getAssetUrl: (relativePath) => ipcRenderer.invoke("obsidian:get-asset-url", relativePath),
    onVaultChanged: (callback) => onRendererEvent("obsidian:vault-changed", callback)
  }
});

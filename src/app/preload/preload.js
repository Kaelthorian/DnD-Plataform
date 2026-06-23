const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dndSheet", {
  load: () => ipcRenderer.invoke("sheet:load"),
  save: (data) => ipcRenderer.invoke("sheet:save", data),
  clear: () => ipcRenderer.invoke("sheet:clear"),
  loadStore: () => ipcRenderer.invoke("sheet:store:load"),
  saveStore: (store) => ipcRenderer.invoke("sheet:store:save", store),
  clearSlot: (slotId) => ipcRenderer.invoke("sheet:slot:clear", slotId),
  loadPdf: () => ipcRenderer.invoke("pdf:load"),
  getBackgroundImageUrl: () => ipcRenderer.invoke("background:image-url"),
  getPlatformBackgroundImageUrl: () => ipcRenderer.invoke("platform-background:image-url"),
  onPlatformBackgroundChanged: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, imageUrl) => callback(imageUrl);
    ipcRenderer.on("platform-background:changed", listener);
    return () => ipcRenderer.removeListener("platform-background:changed", listener);
  },
  loadRaces: () => ipcRenderer.invoke("races:load"),
  loadBackgrounds: () => ipcRenderer.invoke("backgrounds:load"),
  loadClasses: () => ipcRenderer.invoke("classes:load"),
  loadSpells: () => ipcRenderer.invoke("spells:load"),
  loadFeats: () => ipcRenderer.invoke("feats:load"),
  loadItems: () => ipcRenderer.invoke("items:load"),
  loadLanguages: () => ipcRenderer.invoke("languages:load"),
  translateText: (text, from = "en", to = "es") => ipcRenderer.invoke("translate:text", { text, from, to })
});

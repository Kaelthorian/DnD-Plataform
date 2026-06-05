const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dndSheet", {
  load: () => ipcRenderer.invoke("sheet:load"),
  save: (data) => ipcRenderer.invoke("sheet:save", data),
  clear: () => ipcRenderer.invoke("sheet:clear"),
  loadPdf: () => ipcRenderer.invoke("pdf:load"),
  loadRaces: () => ipcRenderer.invoke("races:load"),
  loadBackgrounds: () => ipcRenderer.invoke("backgrounds:load"),
  loadClasses: () => ipcRenderer.invoke("classes:load"),
  loadSpells: () => ipcRenderer.invoke("spells:load")
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  savePdf: (html, defaultName) => ipcRenderer.invoke("pdf:save", { html, defaultName }),
  printPdf: (html) => ipcRenderer.invoke("pdf:print", { html }),
  exportAll: (combinedHtml, count, defaultName) =>
    ipcRenderer.invoke("pdf:exportAll", { combinedHtml, count, defaultName }),
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
});

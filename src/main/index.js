import { app, shell, BrowserWindow } from "electron";
import path from "path";
import { registerIpc } from "./ipc.js";

// On Linux dev machines the Chromium SUID sandbox helper often isn't owned by
// root (4755), which aborts launch. This app only ever renders trusted local
// HTML/data-URLs, so we disable the OS sandbox in development. Packaged builds
// keep the sandbox enabled (electron-builder ships chrome-sandbox with the
// correct permissions inside the bundle).
if (process.platform === "linux" && !app.isPackaged) {
  app.commandLine.appendSwitch("no-sandbox");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Fusion Grade Sheet",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // electron-vite sets ELECTRON_RENDERER_URL in dev; load the built file otherwise.
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

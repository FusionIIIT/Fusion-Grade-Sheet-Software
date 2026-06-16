// IPC handlers: save single PDF, print, export-all (merged PDF), config load/save.
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import fs from "fs/promises";
import path from "path";
import { renderPdf, printHtml } from "./pdf.js";

const CONFIG_FILE = () => path.join(app.getPath("userData"), "academicConfig.json");

export function registerIpc() {
  // Save one student's grade sheet as a PDF.
  ipcMain.handle("pdf:save", async (_e, { html, defaultName }) => {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Save Grade Sheet",
      defaultPath: defaultName || "grade_sheet.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const pdf = await renderPdf(html);
    await fs.writeFile(filePath, pdf);
    return { ok: true, path: filePath };
  });

  // Print one student's grade sheet via the native dialog.
  ipcMain.handle("pdf:print", async (_e, { html }) => {
    return printHtml(html);
  });

  // Export All: render ONE combined multi-page document in a single pass (fast).
  ipcMain.handle("pdf:exportAll", async (_e, { combinedHtml, count, defaultName }) => {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Export All Grade Sheets",
      defaultPath: defaultName || "grade_sheets.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    const pdfBytes = await renderPdf(combinedHtml, { shrink: false });
    await fs.writeFile(filePath, Buffer.from(pdfBytes));
    return { ok: true, path: filePath, count };
  });

  // Persisted (user-edited) dropdown config. Returns null if none saved yet.
  ipcMain.handle("config:load", async () => {
    try {
      const raw = await fs.readFile(CONFIG_FILE(), "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  ipcMain.handle("config:save", async (_e, config) => {
    await fs.writeFile(CONFIG_FILE(), JSON.stringify(config, null, 2), "utf-8");
    return { ok: true };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF rendering via Chromium's printToPDF.
//
//  Fidelity notes:
//   - preferCSSPageSize:true makes Chromium honour the template's
//     `@page { size:A4; margin-top:7.5cm; margin-left/right:2.3cm; bottom:2.3cm }`
//     — i.e. the SAME layout path the browser uses when you Print → Save as PDF
//     in the portal (image 3).
//   - Before printing we run the identical font auto-shrink loop the portal runs
//     in printViaIframe (gradeSheet.jsx:618-628), measured in a 620px-wide window
//     (= A4 content width, 164mm ≈ 620px @96dpi).
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserWindow, app } from "electron";
import { writeFile, unlink } from "fs/promises";
import path from "path";

// A4 content width (210mm - 2*2.3cm margins = 164mm ≈ 620px at 96dpi).
const CONTENT_W_PX = 620;

// Load HTML by writing it to a temp file and loadFile()'ing it, instead of a
// data: URL. data: URLs are length-capped by Chromium (~2MB on Windows), so a
// large "Export All" combined document silently failed to load. A temp file has
// no size limit and works identically on every OS. Returns the temp path so the
// caller can delete it.
let tmpCounter = 0;
async function loadHtml(win, html) {
  const file = path.join(app.getPath("temp"), `fgs-${process.pid}-${tmpCounter++}.html`);
  await writeFile(file, html, "utf-8");
  await win.loadFile(file);
  return file;
}

async function cleanup(file) {
  if (file) { try { await unlink(file); } catch { /* ignore */ } }
}

// Same auto-shrink the portal applies before printing (gradeSheet.jsx:618-628).
const SHRINK_SCRIPT = `
(() => {
  const availH = Math.round((297 - 80 - 23) / 25.4 * 96);
  let base = 9;
  for (let i = 0; i < 3; i++) {
    if (document.body.scrollHeight <= availH) break;
    base -= 1;
    document.documentElement.style.setProperty('--fs',    base + 'pt');
    document.documentElement.style.setProperty('--fs-sm', (base - 0.5) + 'pt');
    document.documentElement.style.setProperty('--fs-xs', (base - 1) + 'pt');
  }
  return true;
})();
`;

/**
 * Render an HTML string to a single PDF (Buffer) using an offscreen window.
 */
export async function renderPdf(html, { shrink = true } = {}) {
  const win = new BrowserWindow({
    width: CONTENT_W_PX,
    height: 1200,
    show: false,
    useContentSize: true,
    webPreferences: { offscreen: false, sandbox: true },
  });

  let file;
  try {
    file = await loadHtml(win, html);
    await waitForReady(win);
    // The font auto-shrink only makes sense for a single-page sheet. For the
    // combined multi-page export it would shrink every page, so skip it there.
    if (shrink) await win.webContents.executeJavaScript(SHRINK_SCRIPT, true);

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4",
    });
    return pdf;
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await cleanup(file);
  }
}

// Wait until the page has laid out (fonts ready + a paint) instead of fixed sleeps.
function waitForReady(win) {
  return win.webContents.executeJavaScript(
    `new Promise((resolve) => {
       const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
       if (document.fonts && document.fonts.ready) document.fonts.ready.then(done); else done();
     })`,
    true
  );
}

/**
 * Open an HTML string in an offscreen window and trigger the native print dialog.
 */
export async function printHtml(html) {
  const win = new BrowserWindow({
    width: CONTENT_W_PX,
    height: 1200,
    show: false,
    useContentSize: true,
    webPreferences: { offscreen: false, sandbox: true },
  });

  const file = await loadHtml(win, html);
  await waitForReady(win);
  await win.webContents.executeJavaScript(SHRINK_SCRIPT, true);

  return new Promise((resolve) => {
    win.webContents.print(
      { silent: false, printBackground: true },
      (success, failureReason) => {
        if (!win.isDestroyed()) win.destroy();
        cleanup(file);
        resolve({ ok: success, reason: failureReason });
      }
    );
  });
}

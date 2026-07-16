<div align="center">

<img src="src/renderer/src/assets/insti_logo.svg" width="90" alt="IIITDM Jabalpur"/>

# Fusion Grade Sheet

**Generate official IIITDM Jabalpur grade-sheet PDFs from an approval sheet — fully offline, on any computer.**

[![Download](https://img.shields.io/badge/Download-Latest%20Release-15ABFF?style=for-the-badge)](https://github.com/FusionIIIT/Fusion-Grade-Sheet-Software/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
![Platforms](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge)

</div>

---

## What it does

The Fusion ERP portal lets you download an **Approval Sheet** (`.xlsx`/`.csv`) for a batch + semester. **Fusion Grade Sheet** turns that one file into pixel-identical, ready-to-print **grade-sheet PDFs** — one per student — without needing the portal, a server, a database, or a login.

- 📄 **Identical to the portal output** — the grade-sheet layout, fonts, margins, grading legend and SPI/CPI logic are ported byte-for-byte from Fusion.
- 🧠 **Zero typing** — Programme, Discipline, Semester and Academic Year are read automatically from the file name.
- 🔎 **Search** any student by roll number or name.
- 🖨️ **Print**, **Download** a single sheet, or **Export All** into one combined PDF in seconds.
- 🎓 **Graduation grid** — upload all of a batch's semester sheets at once and the final-semester sheet shows the full semester-wise SPI/CPI grid + "successfully completed the programme" (driven by cumulative credits from the **TU** column, threshold 148 for Bachelor's / 48 for PG).
- 🔌 **100% offline** — your student data never leaves the machine.

---

## ⬇️ Download & Install

Get the latest installer for your OS from the **[Releases page](https://github.com/FusionIIIT/Fusion-Grade-Sheet-Software/releases/latest)**.

### macOS
1. Download `Fusion Grade Sheet-<version>.dmg` (or `-arm64.dmg` for Apple Silicon).
2. Open the `.dmg` and drag **Fusion Grade Sheet** into **Applications**.
3. First launch (app isn't notarized yet): right-click the app → **Open** → **Open**. If macOS says the app **"is damaged and can't be opened"** (common on Apple Silicon for unsigned apps), clear the download quarantine once in Terminal, then open it:
   ```bash
   xattr -cr "/Applications/Fusion Grade Sheet.app"
   ```

### Windows
1. Download `Fusion Grade Sheet Setup <version>.exe`.
2. Run it. If SmartScreen appears (app isn't signed yet): **More info → Run anyway**.
3. Follow the installer — it adds a Start-menu shortcut.

### Linux
1. Download `Fusion Grade Sheet-<version>.AppImage`.
2. Make it executable and run:
   ```bash
   chmod +x "Fusion Grade Sheet-<version>.AppImage"
   "./Fusion Grade Sheet-<version>.AppImage"
   ```

> The macOS/Windows builds are currently **unsigned**, which is why the OS shows a one-time warning. To remove it permanently we'd add an Apple Developer certificate ($99/yr) and a Windows code-signing certificate — see [Signing](#signing-optional).

---

## 🗑️ Uninstall (complete removal)

Each method removes the app **and** all of its hidden data (config, caches, logs).

### Windows
Open **Settings → Apps → Installed apps → Fusion Grade Sheet → Uninstall** (or use *Add or remove programs*). The uninstaller also clears the app's data automatically. To purge a portable copy or any leftovers, run [`uninstall/uninstall-windows.ps1`](uninstall/uninstall-windows.ps1):
```powershell
powershell -ExecutionPolicy Bypass -File uninstall-windows.ps1
```

### macOS
macOS apps don't ship an uninstaller, so run the purge script (removes the `.app` plus all `~/Library` data):
```bash
bash uninstall/uninstall-macos.sh
```

### Linux
```bash
bash uninstall/uninstall-linux.sh "/path/to/Fusion Grade Sheet-<version>.AppImage"
```

> The scripts live in the [`uninstall/`](uninstall/) folder of this repo. They ask for confirmation, list every path they delete, and remove Application Support / Caches / Preferences / Saved State / logs / registry entries so nothing is left behind.

## How to use

1. Open the app.
2. **Upload** the approval sheet(s). The app reads the details from the file name and shows them as confirmation chips.
   - **One sheet** → grade sheets for that semester (simple Result · SPI · CPI line).
   - **All of a batch's semester sheets together** → the latest semester's sheets render the full **semester-wise SPI/CPI grid** with the graduation line (needs every semester present for a complete grid; missing semesters show "–").
3. Use **Search** to find a student, then **Preview / Print / Download** — or hit **Export All** for the whole batch.

### 📌 File-name convention

The app reads metadata from the file name. Use either format:

| Format | Example | Reads as |
|---|---|---|
| **Compact** (recommended) | `BTech_CSE_Sem3_2024-25.xlsx` | B.Tech · CSE · Sem 3 · 2024-25 |
| with specialization | `MTechAIML_CSE_Sem1_2025-26.xlsx` | M.Tech AI & ML · CSE · Sem 1 · 2025-26 |
| **Summer term** | `BTech_SM_2021_Summer1_2021-22.xlsx` | B.Tech · SM · Summer 1 · 2021-22 |
| **Multi-tab workbook** | `BTech_SM_2021_2021-22.xlsx` (tabs Sem1…Sem8, Summer1) | semester comes from each tab |
| **Portal default name** | `B.Tech - Computer Science and Engineering CSE 2025_Semester 1.xlsx` | B.Tech · CSE · Sem 1 · 2025-26* |

`<Programme>_<Discipline>_Sem<N>_<YYYY-YY>.xlsx`

\* When the academic year isn't in the name, it's derived from the batch year + semester.

Programme codes: `BTech`, `BDes`, `MTech`, `MTechAIML`, `MTechDS`, `MTechVLSI`, `MTechPC`, `MTechCADCAM`, `MDes`, `PhD`, …
Discipline codes (synced 1:1 with the Fusion database): `CSE`, `ECE`, `ME`, `SM`, `MT`, `Des.` (Design), `English`, `Maths`, `Physics`. Matching ignores case and punctuation (so `Des.`, `des`, `DES` all map to Design). Edit/extend the list in [`src/renderer/src/config/academicConfig.json`](src/renderer/src/config/academicConfig.json).

---

## 🛠️ Build from source

```bash
git clone https://github.com/FusionIIIT/Fusion-Grade-Sheet-Software.git
cd Fusion-Grade-Sheet-Software
npm install

npm run dev          # run in development
npm test             # run the parser/template self-tests

# Package installers (run on the matching OS):
npm run dist:mac     # macOS .dmg + .zip   (must run on macOS)
npm run dist:win     # Windows .exe + .zip (must run on Windows)
npm run dist:linux   # Linux  .AppImage
```

Tech stack: **Electron + React + Vite + Mantine**, **SheetJS** for parsing, Chromium `printToPDF` for output.

---

## 🤖 Automatic builds & updates (CI/CD)

You don't build manually for releases. A [GitHub Actions workflow](.github/workflows/release.yml) builds **all three OS installers automatically** and publishes them.

**To cut a new release after making changes:**
```bash
# bump the version in package.json, e.g. 1.0.0 -> 1.0.1, then:
git commit -am "Release v1.0.1"
git tag v1.0.1
git push origin main --tags
```
Pushing the `v*` tag triggers the workflow → it builds on macOS, Windows and Linux runners → uploads the installers to a new GitHub Release.

**Answer to "do download links update automatically?" — yes.** Every link in this README points at `…/releases/latest`, which always resolves to your newest release. So once CI publishes `v1.0.1`, the existing Download buttons serve the new version with **no edits needed**.

You can also trigger a build manually from the **Actions** tab (workflow_dispatch).

---

## ✍️ Signing (optional)

To ship without the unsigned-app warnings:
- **macOS**: add `CSC_LINK` (your `.p12`) + `CSC_KEY_PASSWORD` and Apple notarization creds as GitHub Action secrets; electron-builder signs + notarizes automatically.
- **Windows**: add a code-signing certificate (`CSC_LINK`/`CSC_KEY_PASSWORD`).

---

## License

[MIT](LICENSE) © PDPM IIITDM Jabalpur — Fusion

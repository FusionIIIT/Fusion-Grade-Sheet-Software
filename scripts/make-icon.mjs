// Rasterize the IIITDM badge SVG into a 1024x1024 app icon (white rounded bg).
// electron-builder converts resources/icon.png → .icns / .ico at build time.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SIZE = 1024;
const PAD = 150; // padding around the badge

const svg = readFileSync(resolve(root, "src/renderer/src/assets/insti_logo.svg"));

// Render the badge to fit within SIZE - 2*PAD.
const inner = SIZE - 2 * PAD;
const badge = await sharp(svg, { density: 384 })
  .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// White rounded-square background.
const radius = 180;
const bg = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
     <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
   </svg>`
);

const icon = await sharp(bg)
  .composite([{ input: badge, top: PAD, left: PAD }])
  .png()
  .toBuffer();

writeFileSync(resolve(root, "resources/icon.png"), icon);
console.log("Wrote resources/icon.png (1024x1024)");

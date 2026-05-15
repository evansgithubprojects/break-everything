/**
 * Copies @ffmpeg/core, @ffmpeg/ffmpeg, and @ffmpeg/util ESM builds into
 * public/runtime/vendor/ for same-origin loading (workers + COEP).
 *
 * Run: npm run vendor:ffmpeg
 * Requires: npm install (devDependencies @ffmpeg/*)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const nm = path.join(root, "node_modules");
const destRoot = path.join(root, "public", "runtime", "vendor");

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyFilteredFiles(srcDir, destDir, filter) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (!filter(name)) continue;
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  }
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

const coreSrc = path.join(nm, "@ffmpeg", "core", "dist", "esm");
const ffmpegSrc = path.join(nm, "@ffmpeg", "ffmpeg", "dist", "esm");
const utilSrc = path.join(nm, "@ffmpeg", "util", "dist", "esm");

for (const p of [coreSrc, ffmpegSrc, utilSrc]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing path: ${p}\nRun: npm install`);
    process.exit(1);
  }
}

rmrf(destRoot);

const coreDest = path.join(destRoot, "ffmpeg-core");
const ffmpegDest = path.join(destRoot, "ffmpeg");
const utilDest = path.join(destRoot, "ffmpeg-util");

copyDirRecursive(coreSrc, coreDest);
copyFilteredFiles(
  ffmpegSrc,
  ffmpegDest,
  (n) => n.endsWith(".js") || n.endsWith(".mjs")
);
copyFilteredFiles(utilSrc, utilDest, (n) => n.endsWith(".js"));

const constPath = path.join(ffmpegDest, "const.js");
let constSrc = fs.readFileSync(constPath, "utf8");
constSrc = constSrc.replace(
  /export const CORE_URL = `[^`]+`;/,
  'export const CORE_URL = "/runtime/vendor/ffmpeg-core/ffmpeg-core.js";'
);
fs.writeFileSync(constPath, constSrc, "utf8");

console.log(`Vendored ffmpeg wasm to ${path.relative(root, destRoot)}`);
console.log("  ffmpeg-core:", fs.readdirSync(coreDest).join(", "));
console.log("  ffmpeg:", fs.readdirSync(ffmpegDest).join(", "));
console.log("  ffmpeg-util:", fs.readdirSync(utilDest).join(", "));

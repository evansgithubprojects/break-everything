import { FFmpeg } from "/runtime/vendor/ffmpeg/index.js";
import { fetchFile, toBlobURL } from "/runtime/vendor/ffmpeg-util/index.js";

const sourceEl = document.getElementById("source");
const formatEl = document.getElementById("format");
const qualityEl = document.getElementById("quality");
const convertEl = document.getElementById("convert");
const resetEl = document.getElementById("reset");
const progressEl = document.getElementById("progress");
const statusEl = document.getElementById("status");
const downloadEl = document.getElementById("download");
const logsEl = document.getElementById("logs");

let ffmpeg = null;
let runtimeLoaded = false;
let lastObjectUrl = "";

function setStatus(text) {
  statusEl.textContent = text;
}

function pushLog(text) {
  logsEl.textContent = `${logsEl.textContent}${text}\n`;
  logsEl.scrollTop = logsEl.scrollHeight;
}

function emitRuntimeEvent(type, action) {
  window.parent?.postMessage({ type, action }, "*");
}

function outputName(fileName, ext) {
  const base = fileName.replace(/\.[a-zA-Z0-9]+$/, "");
  return `${base || "converted"}.${ext}`;
}

function outputExtension(format) {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/png") return "png";
  if (format === "image/webp") return "webp";
  if (format === "image/tiff") return "tiff";
  return "bin";
}

function buildArgs(inName, outName, format, quality) {
  const scale = quality === "small" ? ["-vf", "scale='min(1600,iw)':-2"] : [];
  if (format === "image/jpeg") {
    const q = quality === "high" ? "2" : quality === "small" ? "8" : "5";
    return ["-i", inName, ...scale, "-frames:v", "1", "-q:v", q, outName];
  }
  if (format === "image/png") {
    const compression = quality === "high" ? "3" : quality === "small" ? "9" : "6";
    return ["-i", inName, ...scale, "-frames:v", "1", "-compression_level", compression, outName];
  }
  if (format === "image/webp") {
    const q = quality === "high" ? "92" : quality === "small" ? "70" : "82";
    return ["-i", inName, ...scale, "-frames:v", "1", "-c:v", "libwebp", "-quality", q, outName];
  }
  if (format === "image/tiff") {
    return ["-i", inName, ...scale, "-frames:v", "1", "-compression_algo", "deflate", outName];
  }
  throw new Error(`Unsupported image format: ${format}`);
}

async function loadRuntime() {
  if (runtimeLoaded) return;
  pushLog("Initializing ffmpeg.wasm core");

  ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => pushLog(message));
  ffmpeg.on("progress", ({ progress }) => {
    progressEl.value = progress;
  });

  const configuredBase =
    typeof window.__FFMPEG_CORE_BASE === "string" ? window.__FFMPEG_CORE_BASE.trim() : "";
  const base = configuredBase || "/runtime/vendor/ffmpeg-core";
  pushLog(`Using ffmpeg core base: ${base}`);
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });

  runtimeLoaded = true;
  convertEl.disabled = false;
  emitRuntimeEvent("runtime:ready");
}

async function convert() {
  if (!runtimeLoaded || !ffmpeg) {
    setStatus("Still loading the converter. Please wait…");
    return;
  }

  const file = sourceEl.files?.[0];
  if (!file) {
    setStatus("Select an image file first.");
    return;
  }

  const targetFormat = String(formatEl.value);
  const quality = String(qualityEl.value);
  const inputExt = file.name.split(".").pop() || "png";
  const inputName = `input.${inputExt}`;
  const outName = outputName(file.name, outputExtension(targetFormat));
  const args = buildArgs(inputName, outName, targetFormat, quality);

  convertEl.disabled = true;
  progressEl.value = 0;
  setStatus("Converting...");
  emitRuntimeEvent("runtime:action", "convert_start");

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec(args);
    const outData = await ffmpeg.readFile(outName);
    const blob = new Blob([outData.buffer], {
      type: targetFormat,
    });

    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = URL.createObjectURL(blob);
    downloadEl.href = lastObjectUrl;
    downloadEl.download = outName;
    downloadEl.style.display = "inline-block";
    downloadEl.textContent = `Download ${outName}`;

    setStatus("Conversion complete.");
    emitRuntimeEvent("runtime:action", "convert_complete");
  } catch (error) {
    setStatus("Conversion failed.");
    pushLog(`ERROR: ${String(error)}`);
    emitRuntimeEvent("runtime:action", "convert_error");
  } finally {
    convertEl.disabled = false;
  }
}

function reset() {
  location.reload();
}

void loadRuntime().catch((error) => {
  loadFailed = true;
  setStatus("Failed to load runtime. Refresh the page to try again.");
  pushLog(`ERROR: ${String(error)}`);
});

convertEl.addEventListener("click", () => {
  convert().catch((error) => {
    setStatus("Conversion failed.");
    pushLog(`ERROR: ${String(error)}`);
  });
});
resetEl.addEventListener("click", reset);

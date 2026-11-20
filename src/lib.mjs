// Small helpers shared by the build and the checker. No dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT = path.join(ROOT, "content");
export const DIST = path.join(ROOT, "dist");

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Cannot read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Picks the value for `lang` from a {tr, en} object; plain strings pass through. */
export function t(value, lang, fallbackLang) {
  if (value == null) return "";
  if (typeof value !== "object" || Array.isArray(value)) return value;
  if (lang in value) return value[lang];
  if (fallbackLang && fallbackLang in value) return value[fallbackLang];
  return "";
}

/** Relative href from page path `from` (e.g. "en/games/") to `to` (e.g. "assets/site.css"). */
export function rel(from, to) {
  const depth = from.split("/").filter(Boolean).length;
  const up = "../".repeat(depth);
  const href = up + to;
  return href === "" ? "./" : href;
}

/** Replaces {{token}} placeholders. Values are inserted as already-escaped HTML. */
export function fill(text, tokens) {
  return esc(text).replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

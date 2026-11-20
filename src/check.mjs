// Checks the built site: every relative href/src in dist/ must point at a real file,
// every page needs a <title>, one <h1> and alt text on images. Usage: node src/check.mjs
import fs from "node:fs";
import path from "node:path";
import { DIST, ROOT } from "./lib.mjs";

if (!fs.existsSync(DIST)) { console.error("dist/ not found — run the build first."); process.exit(1); }

const problems = [];
let pages = 0, links = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) checkPage(p);
  }
}

function checkPage(file) {
  pages++;
  const html = fs.readFileSync(file, "utf8");
  const where = path.relative(DIST, file).replace(/\\/g, "/");
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${where}: missing <title>`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (where !== "404.html" && h1 !== 1) problems.push(`${where}: expected one <h1>, found ${h1}`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) problems.push(`${where}: <img> without alt`);
  if (/\{\{\w+\}\}/.test(html)) problems.push(`${where}: unreplaced {{token}}`);
  if (where === "404.html") return; // uses site-root links, checked by hand
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"|url\('([^']+)'\)/g)) {
    const url = m[1] ?? m[2];
    if (/^(https?:|mailto:|#|data:)/.test(url)) continue;
    links++;
    let target = path.resolve(path.dirname(file), url.split("#")[0].split("?")[0]);
    if (url.endsWith("/") || url === "./") target = path.join(target, "index.html");
    if (!fs.existsSync(target)) problems.push(`${where}: broken link "${url}"`);
  }
}

walk(DIST);
for (const p of problems) console.error(`  FAIL  ${p}`);
console.log(`Checked ${pages} pages, ${links} internal links: ${problems.length ? `${problems.length} problem(s)` : "all OK"} (${path.relative(ROOT, DIST)}/)`);
process.exit(problems.length ? 1 : 0);

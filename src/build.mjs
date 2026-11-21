// Builds the static MRY GAMES site from content/ into dist/.
// Usage: node src/build.mjs            (warnings are printed, errors stop the build)
//        node src/build.mjs --strict   (warnings also fail: use before publishing for real)
import fs from "node:fs";
import path from "node:path";
import { ROOT, CONTENT, DIST, readJson, esc, t, rel, fill, ensureDir, copyDir } from "./lib.mjs";
import { icon, iconNames, logoMark, LOGO_MARK_SVG } from "./icons.mjs";

const STRICT = process.argv.includes("--strict");
const STATUSES = ["in-development", "coming-soon", "released"];
const PRIVACY_FLAGS = ["ads", "inAppPurchases", "analytics", "localSaveOnly", "childDirected"];
const warnings = [];
const errors = [];
const warn = (m) => warnings.push(m);
const fail = (m) => errors.push(m);

// ---------------------------------------------------------------- content
const site = readJson(path.join(CONTENT, "site.json"));
const i18n = readJson(path.join(CONTENT, "i18n.json"));
const LANGS = site.languages;
const legal = {};
for (const lang of LANGS) {
  legal[lang] = {
    studio: readJson(path.join(CONTENT, "legal", `studio-privacy.${lang}.json`)),
    game: readJson(path.join(CONTENT, "legal", `game-privacy.${lang}.json`)),
  };
}
const games = loadGames();

function loadGames() {
  const dir = path.join(CONTENT, "games");
  const list = [];
  for (const slug of fs.readdirSync(dir)) {
    if (slug.startsWith("_") || !fs.statSync(path.join(dir, slug)).isDirectory()) continue; // _template etc.
    const file = path.join(dir, slug, "game.json");
    if (!fs.existsSync(file)) { fail(`games/${slug}: game.json is missing`); continue; }
    const g = readJson(file);
    g.dir = path.join(dir, slug);
    validateGame(g, slug);
    list.push(g);
  }
  return list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function validateGame(g, folder) {
  const where = `games/${folder}`;
  if (g.slug !== folder) fail(`${where}: "slug" (${g.slug}) must equal the folder name`);
  if (!/^[a-z0-9-]+$/.test(folder)) fail(`${where}: folder name must be lowercase letters, digits and dashes`);
  if (!STATUSES.includes(g.status)) fail(`${where}: "status" must be one of ${STATUSES.join(", ")}`);
  for (const lang of LANGS) {
    for (const key of ["title", "tagline", "summary", "description", "genre"]) {
      const v = t(g[key], lang);
      if (!v || (Array.isArray(v) && !v.length)) fail(`${where}: "${key}.${lang}" is empty`);
    }
  }
  const mediaFiles = new Set([...Object.values(g.media ?? {}), ...(g.screenshots ?? []).map((s) => s.file), ...(g.characters ?? []).map((c) => c.portrait)]);
  for (const key of ["icon", "cover", "heroShot"]) if (!g.media?.[key]) fail(`${where}: "media.${key}" is required`);
  for (const f of mediaFiles) if (f && !fs.existsSync(path.join(g.dir, "media", f))) fail(`${where}: media file "${f}" not found in media/`);
  for (const f of g.features ?? []) if (!iconNames().includes(f.icon)) fail(`${where}: feature icon "${f.icon}" unknown (use ${iconNames().join(", ")})`);
  if (!/^#[0-9a-f]{6}$/i.test(g.accent ?? "")) fail(`${where}: "accent" must be a #rrggbb colour`);
  if (g.status === "released" && !g.googlePlayUrl) fail(`${where}: released games need "googlePlayUrl"`);
  if (g.googlePlayUrl && !g.googlePlayUrl.startsWith("https://play.google.com/")) fail(`${where}: "googlePlayUrl" must be a play.google.com link`);
  if (!g.privacy) fail(`${where}: "privacy" block is required (Google Play needs a privacy policy URL)`);
  else {
    for (const flag of PRIVACY_FLAGS) if (typeof g.privacy[flag] !== "boolean") fail(`${where}: "privacy.${flag}" must be true or false`);
    if (g.privacy.draft) warn(`${where}: privacy policy is marked as DRAFT (shows a banner) — review and set "draft": false`);
    if (t(g.privacy.pendingThirdParties, "tr")) warn(`${where}: privacy lists third parties that are not decided yet`);
  }
  if (g.packageIdIsPlaceholder) warn(`${where}: package id "${g.packageId}" is a placeholder`);
}

if (site.contact.emailIsPlaceholder) warn(`site.json: contact email "${site.contact.email}" is a placeholder`);
if (site.legal.privacyDraft) warn(`site.json: studio privacy policy is marked as DRAFT`);
if (!site.url) warn(`site.json: "url" is empty — canonical links, sitemap.xml and social preview URLs are skipped`);

if (errors.length) report(true);

// ---------------------------------------------------------------- page model
const routeOf = (key, lang, params = {}) => i18n[lang].routes[key].replace("{slug}", params.slug ?? "");
const pages = [];
const page = (key, params, lang, render) => pages.push({ key, params, lang, path: routeOf(key, lang, params), render });

for (const lang of LANGS) {
  page("home", {}, lang, renderHome);
  page("games", {}, lang, renderGames);
  page("about", {}, lang, renderAbout);
  page("contact", {}, lang, renderContact);
  page("privacy", {}, lang, renderStudioPrivacy);
  for (const g of games) {
    page("game", { slug: g.slug }, lang, (ctx) => renderGame(ctx, g));
    page("gamePrivacy", { slug: g.slug }, lang, (ctx) => renderGamePrivacy(ctx, g));
  }
}

// ---------------------------------------------------------------- write
// Called at the end of the file so every helper below is initialised first.
function main() {
fs.rmSync(DIST, { recursive: true, force: true });
ensureDir(DIST);
copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
fs.writeFileSync(path.join(DIST, "assets", "favicon.svg"), LOGO_MARK_SVG);
for (const g of games) copyDir(path.join(g.dir, "media"), path.join(DIST, "media", g.slug));

for (const p of pages) {
  const ctx = makeCtx(p);
  const body = p.render(ctx);
  writePage(p.path, layout(ctx, body));
}
writePage("404.html", render404(), true);
fs.writeFileSync(path.join(DIST, ".nojekyll"), "");
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n${site.url ? `Sitemap: ${site.url.replace(/\/$/, "")}/sitemap.xml\n` : ""}`);
if (site.url) fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap());
if (site.appAdsTxt?.length) fs.writeFileSync(path.join(DIST, "app-ads.txt"), site.appAdsTxt.join("\n") + "\n");
if (site.cname) fs.writeFileSync(path.join(DIST, "CNAME"), site.cname + "\n");

console.log(`Built ${pages.length + 1} pages for ${games.length} game(s) into ${path.relative(ROOT, DIST)}/`);
report(false);
}

function writePage(p, html, isFile = false) {
  const file = isFile ? path.join(DIST, p) : path.join(DIST, p, "index.html");
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, html);
}

function report(stop) {
  for (const w of warnings) console.warn(`  WARN  ${w}`);
  for (const e of errors) console.error(`  ERROR ${e}`);
  if (stop || errors.length || (STRICT && warnings.length)) {
    console.error(STRICT && !errors.length ? "Build failed: --strict does not allow warnings." : "Build failed.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------- context
function makeCtx(p) {
  const L = i18n[p.lang];
  const href = (key, params) => rel(p.path, routeOf(key, p.lang, params));
  return {
    ...p,
    L,
    href,
    asset: (f) => rel(p.path, `assets/${f}`),
    media: (g, f) => rel(p.path, `media/${g.slug}/${f}`),
    altPath: (lang) => routeOf(p.key, lang, p.params),
    tr: (v) => t(v, p.lang, site.defaultLang),
  };
}

const absUrl = (p) => (site.url ? site.url.replace(/\/$/, "") + "/" + p : "");

function layout(ctx, { title, description, body, ogImage, bodyClass = "", style = "" }) {
  const { L, lang } = ctx;
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} — ${ctx.tr(site.tagline)}`;
  const alternates = LANGS.map((l) => {
    const p = ctx.altPath(l);
    return `<link rel="alternate" hreflang="${l}" href="${site.url ? absUrl(p) : rel(ctx.path, p)}">`;
  }).join("");
  const otherLang = LANGS.find((l) => l !== lang);
  const nav = ["home", "games", "about", "contact"].map((k) => {
    const current = ctx.key === k || (k === "games" && ctx.key === "game");
    return `<a href="${ctx.href(k)}"${current ? ' aria-current="page"' : ""}>${esc(L.nav[k])}</a>`;
  }).join("");
  const langLink = `<a class="lang-switch" href="${rel(ctx.path, ctx.altPath(otherLang))}" hreflang="${otherLang}" lang="${otherLang}">${icon("globe")}<span>${esc(i18n[otherLang].langShort)}</span></a>`;
  const og = ogImage && site.url ? `<meta property="og:image" content="${absUrl(ogImage)}">` : "";
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description ?? ctx.tr(site.tagline))}">
<meta name="theme-color" content="#F4E6C9">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description ?? ctx.tr(site.tagline))}">
${og}
${site.url ? `<link rel="canonical" href="${absUrl(ctx.path)}">` : ""}
${alternates}
<link rel="icon" href="${ctx.asset("favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="${ctx.asset("fonts/Baloo2-ExtraBold.woff")}" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${ctx.asset("site.css")}">
${style ? `<style>${style}</style>` : ""}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${esc(L.skip)}</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${ctx.href("home")}" aria-label="${esc(site.name)} — ${esc(L.nav.home)}">${logoMark()}<span class="wordmark"><b>MRY</b> GAMES</span></a>
    <nav class="nav-desktop" aria-label="${esc(L.nav.menu)}">${nav}</nav>
    <div class="header-tools">
      ${langLink}
      <details class="nav-mobile">
        <summary aria-label="${esc(L.nav.menu)}">${icon("menu")}</summary>
        <nav aria-label="${esc(L.nav.menu)}">${nav}<a href="${ctx.href("privacy")}">${esc(L.nav.privacy)}</a></nav>
      </details>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">${logoMark()}<div><span class="wordmark"><b>MRY</b> GAMES</span><p>${esc(ctx.tr(site.tagline))}</p></div></div>
    <nav class="footer-links" aria-label="${esc(L.nav.menu)}">
      <a href="${ctx.href("games")}">${esc(L.nav.games)}</a>
      <a href="${ctx.href("about")}">${esc(L.nav.about)}</a>
      <a href="${ctx.href("contact")}">${esc(L.nav.contact)}</a>
      <a href="${ctx.href("privacy")}">${esc(L.nav.privacy)}</a>
    </nav>
    <p class="footer-fine">© ${new Date().getFullYear()} ${esc(site.name)}. ${esc(L.footer.rights)} ${esc(L.footer.fonts)}</p>
  </div>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- shared blocks
const gameStyle = (g) => `:root{--accent:${g.accent};--accent-deep:${g.accentDeep ?? g.accent}}`;

function phone(src, alt, cls = "") {
  return `<figure class="phone ${cls}"><div class="phone-screen"><img src="${src}" alt="${esc(alt)}" width="720" height="1560" loading="lazy" decoding="async"></div></figure>`;
}

function statusChip(ctx, g) {
  return `<span class="chip chip-${g.status}">${esc(ctx.L.status[g.status])}</span>`;
}

function storeButton(ctx, g) {
  if (g.googlePlayUrl) {
    return `<a class="btn btn-store" href="${esc(g.googlePlayUrl)}" rel="noopener">${icon("play")}<span>${esc(ctx.L.game.playStore)}</span></a>`;
  }
  return `<span class="btn btn-store is-soon" aria-disabled="true">${icon("play")}<span>${esc(ctx.L.game.playStoreSoon)}</span></span>`;
}

function gameCard(ctx, g) {
  return `<article class="game-card" style="--accent:${g.accent}">
  <div class="game-card-cover"><img src="${ctx.media(g, g.media.cover)}" alt="" width="1080" height="608" loading="lazy" decoding="async">${statusChip(ctx, g)}</div>
  <div class="game-card-body">
    <img class="app-icon" src="${ctx.media(g, g.media.icon)}" alt="" width="256" height="256" loading="lazy">
    <div>
      <h3><a href="${ctx.href("game", g)}">${esc(ctx.tr(g.title))}</a></h3>
      <p class="muted">${esc(ctx.tr(g.genre))}</p>
    </div>
  </div>
  <p class="game-card-text">${esc(ctx.tr(g.summary))}</p>
</article>`;
}

function moreCard(ctx) {
  return `<div class="game-card game-card-more">${icon("sparkle", "icon icon-lg")}<p>${esc(ctx.L.games.more)}</p></div>`;
}

function valueCards(ctx) {
  return `<div class="value-grid">${site.values.map((v) => `<div class="card value">${icon(v.icon, "icon icon-lg")}<h3>${esc(ctx.tr(v.title))}</h3><p>${esc(ctx.tr(v.text))}</p></div>`).join("")}</div>`;
}

const hills = `<svg class="hills" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70C160 20 300 20 460 55s300 50 470 10 330-50 510 0v85H0z" fill="#9CC27A"/><path d="M0 95c180-35 360-40 540-10s340 30 520 0 280-25 380-10v45H0z" fill="#78A85B"/></svg>`;

// ---------------------------------------------------------------- pages
function renderHome(ctx) {
  const { L } = ctx;
  const featured = games.find((g) => g.featured) ?? games[0];
  const hero = featured
    ? `<div class="hero-art" style="--accent:${featured.accent}">
        ${phone(ctx.media(featured, featured.media.heroShot), ctx.tr(featured.screenshots?.[0]?.alt) || ctx.tr(featured.title), "phone-hero")}
        <a class="hero-badge" href="${ctx.href("game", featured)}"><img src="${ctx.media(featured, featured.media.icon)}" alt="" width="256" height="256"><span><small>${esc(L.home.featured)}</small><b>${esc(ctx.tr(featured.title))}</b></span></a>
      </div>`
    : "";
  const featuredBand = featured
    ? `<section class="section">
  <div class="wrap featured" style="${gameStyle(featured).replace(":root{", "").replace("}", "")}">
    <div class="featured-cover"><img src="${ctx.media(featured, featured.media.cover)}" alt="${esc(ctx.tr(featured.screenshots?.[0]?.alt))}" width="1080" height="608" loading="lazy" decoding="async"></div>
    <div class="featured-text">
      <p class="kicker">${esc(L.home.featured)}</p>
      <h2>${esc(ctx.tr(featured.title))}</h2>
      <p class="lead">${esc(ctx.tr(featured.tagline))}</p>
      <p>${esc(ctx.tr(featured.summary))}</p>
      <div class="btn-row"><a class="btn btn-primary" href="${ctx.href("game", featured)}">${esc(L.home.discover)}${icon("arrow")}</a>${statusChip(ctx, featured)}</div>
    </div>
  </div>
</section>`
    : "";
  return {
    title: L.home.title,
    description: ctx.tr(site.intro),
    ogImage: featured ? `media/${featured.slug}/${featured.media.og ?? featured.media.cover}` : null,
    bodyClass: "page-home",
    body: `<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-text">
      <p class="kicker">${logoMark("kicker-mark")} ${esc(site.name)}</p>
      <h1>${esc(L.home.title)}</h1>
      <p class="lead">${esc(ctx.tr(site.intro))}</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="${ctx.href("games")}">${esc(L.home.ourGames)}${icon("arrow")}</a>
        <a class="btn btn-ghost" href="${ctx.href("about")}">${esc(L.nav.about)}</a>
      </div>
    </div>
    ${hero}
  </div>
  ${hills}
</section>
${featuredBand}
<section class="section section-paper">
  <div class="wrap">
    <h2 class="section-title">${esc(L.home.valuesTitle)}</h2>
    ${valueCards(ctx)}
  </div>
</section>
${games.length > 1 ? `<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title">${esc(L.home.ourGames)}</h2><a class="link-arrow" href="${ctx.href("games")}">${esc(L.home.allGames)}${icon("arrow")}</a></div>
    <div class="game-grid">${games.map((g) => gameCard(ctx, g)).join("")}${moreCard(ctx)}</div>
  </div>
</section>` : ""}`,
  };
}

function pageHead(title, lead, extra = "") {
  return `<section class="page-head"><div class="wrap"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}${extra}</div></section>`;
}

function renderGames(ctx) {
  const { L } = ctx;
  return {
    title: L.games.title,
    description: L.games.lead,
    body: `${pageHead(L.games.title, L.games.lead)}
<section class="section section-tight"><div class="wrap"><div class="game-grid">${games.map((g) => gameCard(ctx, g)).join("")}${moreCard(ctx)}</div></div></section>`,
  };
}

function renderGame(ctx, g) {
  const { L } = ctx;
  const title = ctx.tr(g.title);
  const subtitle = ctx.tr(g.subtitle);
  const shots = (g.screenshots ?? []).map((s) => phone(ctx.media(g, s.file), ctx.tr(s.alt))).join("");
  const features = (g.features ?? []).map((f) => `<div class="card feature">${icon(f.icon, "icon icon-lg")}<h3>${esc(ctx.tr(f.title))}</h3><p>${esc(ctx.tr(f.text))}</p></div>`).join("");
  const chars = (g.characters ?? []).map((c) => `<li class="character"><img src="${ctx.media(g, c.portrait)}" alt="" width="256" height="256" loading="lazy"><b>${esc(c.name)}</b><span>${esc(ctx.tr(c.role))}</span></li>`).join("");
  const platforms = g.platforms.map((p) => L.platforms[p] ?? p).join(", ");
  return {
    title,
    description: ctx.tr(g.summary),
    ogImage: `media/${g.slug}/${g.media.og ?? g.media.cover}`,
    style: gameStyle(g),
    bodyClass: "page-game",
    body: `<section class="game-hero">
  <div class="game-hero-bg" style="background-image:url('${ctx.media(g, g.media.cover)}')"></div>
  <div class="wrap game-hero-inner">
    <div class="game-hero-text">
      <a class="link-back" href="${ctx.href("games")}">${icon("back")}${esc(L.game.backToGames)}</a>
      <div class="game-title-row">
        <img class="app-icon app-icon-lg" src="${ctx.media(g, g.media.icon)}" alt="" width="256" height="256">
        <div><h1>${esc(title)}</h1>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}</div>
      </div>
      <p class="lead">${esc(ctx.tr(g.tagline))}</p>
      <div class="btn-row">${storeButton(ctx, g)}${statusChip(ctx, g)}</div>
    </div>
    ${phone(ctx.media(g, g.media.heroShot), ctx.tr(g.screenshots?.[0]?.alt) || title, "phone-hero")}
  </div>
  ${hills}
</section>
<section class="section">
  <div class="wrap">
    <h2 class="section-title">${esc(L.game.features)}</h2>
    <div class="feature-grid">${features}</div>
  </div>
</section>
<section class="section section-paper">
  <div class="wrap story">
    <div class="story-text">
      <h2 class="section-title">${esc(L.game.story)}</h2>
      ${ctx.tr(g.description).map((para) => `<p>${esc(para)}</p>`).join("")}
    </div>
    ${chars ? `<div class="story-cast"><h3>${esc(L.game.characters)}</h3><ul class="character-grid">${chars}</ul></div>` : ""}
  </div>
</section>
<section class="section">
  <div class="wrap">
    <h2 class="section-title">${esc(L.game.screenshots)}</h2>
  </div>
  <div class="shots" tabindex="0" aria-label="${esc(L.game.screenshots)}"><div class="shots-track">${shots}</div></div>
</section>
<section class="section section-tight">
  <div class="wrap">
    <div class="card details">
      <h2>${esc(L.game.details)}</h2>
      <dl>
        <div><dt>${esc(L.game.genre)}</dt><dd>${esc(ctx.tr(g.genre))}</dd></div>
        <div><dt>${esc(L.game.platform)}</dt><dd>${esc(platforms)}</dd></div>
        <div><dt>${esc(L.game.status)}</dt><dd>${esc(L.status[g.status])}</dd></div>
      </dl>
      <div class="btn-row">${storeButton(ctx, g)}<a class="btn btn-ghost" href="${ctx.href("gamePrivacy", g)}">${icon("shield")}${esc(L.game.privacy)}</a></div>
    </div>
  </div>
</section>`,
  };
}

function renderAbout(ctx) {
  const { L } = ctx;
  return {
    title: L.about.title,
    description: ctx.tr(site.intro),
    body: `${pageHead(L.about.title, ctx.tr(site.tagline))}
<section class="section section-tight"><div class="wrap"><div class="prose card about-card">${ctx.tr(site.about).map((p) => `<p>${esc(p)}</p>`).join("")}</div></div></section>
<section class="section section-paper"><div class="wrap"><h2 class="section-title">${esc(L.home.valuesTitle)}</h2>${valueCards(ctx)}</div></section>`,
  };
}

function renderContact(ctx) {
  const { L } = ctx;
  const email = site.contact.email;
  return {
    title: L.contact.title,
    description: L.contact.lead,
    body: `${pageHead(L.contact.title, L.contact.lead)}
<section class="section section-tight"><div class="wrap contact-grid">
  <a class="card contact-card" href="mailto:${esc(email)}">${icon("mail", "icon icon-lg")}<span><small>${esc(L.contact.email)}</small><b>${esc(email)}</b></span></a>
  <div class="card contact-card">${icon("pin", "icon icon-lg")}<span><small>${esc(L.contact.location)}</small><b>${esc(ctx.tr(site.contact.location))}</b></span></div>
  <div class="card contact-note"><h2>${esc(L.contact.support)}</h2><p>${esc(L.contact.supportText)}</p></div>
</div></section>`,
  };
}

// ---------------------------------------------------------------- privacy
function legalTokens(ctx, g) {
  const email = `<a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>`;
  return { studio: esc(site.name), email, game: g ? esc(ctx.tr(g.title)) : "", package: g ? `<code>${esc(g.packageId)}</code>` : "" };
}

function visible(item, flags) {
  if (!item || typeof item !== "object" || !item.when) return true;
  const neg = item.when.startsWith("!");
  const value = !!flags[item.when.replace(/^!/, "")];
  return neg ? !value : value;
}

function legalBody(ctx, doc, flags, tokens, extras) {
  const text = (item) => fill(typeof item === "string" ? item : item.text, tokens);
  return doc.sections
    .filter((s) => visible(s, flags))
    .map((s) => {
      const ps = (s.p ?? []).filter((x) => visible(x, flags)).map((x) => `<p>${text(x)}</p>`).join("");
      const ul = s.ul ? `<ul>${s.ul.filter((x) => visible(x, flags)).map((x) => `<li>${text(x)}</li>`).join("")}</ul>` : "";
      const extra = (s.gamesList && extras.gamesList) || (s.thirdParties && extras.thirdParties) || "";
      return `<section><h2>${fill(s.h, tokens)}</h2>${ps}${ul}${extra}</section>`;
    })
    .join("");
}

function privacyPage(ctx, { doc, flags, tokens, extras, updated, draft, other }) {
  const { L } = ctx;
  const date = new Date(updated + "T00:00:00Z").toLocaleDateString(L.htmlLang === "tr" ? "tr-TR" : "en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const title = fill(doc.title, tokens).replace(/<[^>]+>/g, "");
  return {
    title: title.replace(/&amp;/g, "&"),
    description: fill(doc.lead, tokens).replace(/<[^>]+>/g, ""),
    bodyClass: "page-legal",
    body: `<section class="page-head"><div class="wrap narrow">
  <h1>${fill(doc.title, tokens)}</h1>
  <p class="meta">${esc(L.privacy.updated)}: <time datetime="${esc(updated)}">${esc(date)}</time> · <a href="${rel(ctx.path, other)}">${esc(L.privacy.otherLang)}</a></p>
</div></section>
<section class="section section-tight"><div class="wrap narrow">
  ${draft ? `<p class="draft-banner" role="note">${esc(L.privacy.draft)}</p>` : ""}
  <article class="card prose legal">
    <p class="lead">${fill(doc.lead, tokens)}</p>
    ${legalBody(ctx, doc, flags, tokens, extras)}
  </article>
</div></section>`,
  };
}

function renderStudioPrivacy(ctx) {
  const tokens = legalTokens(ctx, null);
  const gamesList = `<ul>${games.map((g) => `<li><a href="${ctx.href("gamePrivacy", g)}">${esc(ctx.tr(g.title))}</a></li>`).join("")}</ul>`;
  return privacyPage(ctx, {
    doc: legal[ctx.lang].studio,
    flags: {},
    tokens,
    extras: { gamesList },
    updated: site.legal.privacyLastUpdated,
    draft: site.legal.privacyDraft,
    other: ctx.altPath(LANGS.find((l) => l !== ctx.lang)),
  });
}

function renderGamePrivacy(ctx, g) {
  const pv = g.privacy;
  const tokens = legalTokens(ctx, g);
  const items = pv.thirdParties.map((tp) => `<li><b>${esc(tp.name)}</b> — ${esc(ctx.tr(tp.purpose))}. <a href="${esc(tp.policyUrl)}" rel="noopener">${esc(tp.policyUrl.replace(/^https:\/\//, ""))}</a></li>`).join("");
  const pending = ctx.tr(pv.pendingThirdParties);
  const thirdParties = `<ul>${items}</ul>${pending ? `<p class="pending"><b>${esc(ctx.L.privacy.pendingTitle)}:</b> ${esc(pending)}</p>` : ""}`;
  const doc = legal[ctx.lang].game;
  tokens.savedData = esc(pv.savedData ? ctx.tr(pv.savedData) : doc.defaultSavedData);
  const flags = { ...pv, hasThirdParties: pv.thirdParties.length > 0 || !!pending, hasPartners: pv.ads || pv.inAppPurchases };
  const r = privacyPage(ctx, {
    doc,
    flags,
    tokens,
    extras: { thirdParties },
    updated: pv.lastUpdated,
    draft: pv.draft,
    other: ctx.altPath(LANGS.find((l) => l !== ctx.lang)),
  });
  r.style = gameStyle(g);
  return r;
}

function render404() {
  const p = { key: "home", params: {}, lang: site.defaultLang, path: "" };
  const ctx = makeCtx(p);
  // 404.html is served from any URL depth, so it uses root-absolute links only when site.url is known.
  const blocks = LANGS.map((lang) => {
    const L = i18n[lang];
    return `<div class="card notfound" lang="${lang}"><h1>${esc(L.notFound.title)}</h1><p>${esc(L.notFound.text)}</p><a class="btn btn-primary" href="${site.url ? absUrl(routeOf("home", lang)) : "/" + routeOf("home", lang)}">${esc(L.notFound.back)}</a></div>`;
  }).join("");
  const html = layout(ctx, { title: i18n[site.defaultLang].notFound.title, body: `<section class="section"><div class="wrap narrow notfound-wrap">${blocks}</div></section>` });
  // Make asset links root-relative so the page renders at any depth.
  const base = site.url ? new URL(site.url).pathname.replace(/\/?$/, "/") : "/";
  return html.replace(/(href|src)="(?!https?:|mailto:|#|\/)([^"]*)"/g, (m, attr, url) => `${attr}="${base}${url.replace(/^(\.\.\/)+/, "").replace(/^\.\/$/, "")}"`);
}

function sitemap() {
  const urls = pages.map((p) => `  <url><loc>${absUrl(p.path)}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absUrl(routeOf(p.key, l, p.params))}"/>`).join("")}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
main();

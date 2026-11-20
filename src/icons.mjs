// Inline SVG icons and the studio mark. Hand-drawn in the cocoa-outline style of the games.
const C = "#59402F"; // deep cocoa
const svg = (body, cls = "icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="${C}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  leaf: `<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" fill="#78A85B"/><path d="M5 19l8-8"/>`,
  heart: `<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#C96C63"/>`,
  book: `<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" fill="#F4E6C9"/><path d="M12 6v13.5"/>`,
  merge: `<rect x="3" y="4" width="8" height="8" rx="2" fill="#E8B94F"/><rect x="13" y="12" width="8" height="8" rx="2" fill="#78B9D2"/><path d="M14 6h3a2 2 0 0 1 2 2v1M10 18H7a2 2 0 0 1-2-2v-1"/>`,
  sprout: `<path d="M12 20v-8"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z" fill="#78A85B"/><path d="M12 14c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z" fill="#426B45"/><path d="M6 20h12"/>`,
  house: `<path d="M5 11l7-6 7 6v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="#F4E6C9"/><path d="M3 12l9-8 9 8" stroke-width="2.2"/><path d="M10 20v-5h4v5" fill="#C97850"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2.5" fill="#F4E6C9"/><path d="M4 7l8 6 8-6"/>`,
  pin: `<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" fill="#C97850"/><circle cx="12" cy="10" r="2.2" fill="#F4E6C9"/>`,
  shield: `<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" fill="#65AFA7"/><path d="M9 12l2 2 4-4"/>`,
  arrow: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  back: `<path d="M19 12H5M11 6l-6 6 6 6"/>`,
  globe: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.5 5.2 3.5 8.5s-1 6.1-3.5 8.5c-2.5-2.4-3.5-5.2-3.5-8.5s1-6.1 3.5-8.5z"/>`,
  play: `<path d="M5 3.8v16.4a.8.8 0 0 0 1.2.7l14-8.2a.8.8 0 0 0 0-1.4l-14-8.2A.8.8 0 0 0 5 3.8z" fill="#78A85B"/>`,
  sparkle: `<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="#E8B94F"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
};

export function icon(name, cls) {
  const body = ICONS[name];
  if (!body) throw new Error(`Unknown icon "${name}". Known: ${Object.keys(ICONS).join(", ")}`);
  return svg(body, cls);
}

export const iconNames = () => Object.keys(ICONS);

/** Studio mark: a little restored house on a terracotta tile. */
export const LOGO_MARK_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="58" height="58" rx="17" fill="#C97850" stroke="${C}" stroke-width="3"/><path d="M45 13c0-.1 6 1 6 7-5 .5-7.5-2.5-6-7z" fill="#78A85B" stroke="${C}" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 31 32 19l14 12v15a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3z" fill="#F4E6C9" stroke="${C}" stroke-width="3" stroke-linejoin="round"/><path d="M13 32 32 15.5 51 32" fill="none" stroke="${C}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="31.5" r="3.6" fill="#E8B94F" stroke="${C}" stroke-width="2.2"/><path d="M27.5 49v-6.5a4.5 4.5 0 0 1 9 0V49" fill="#78A85B" stroke="${C}" stroke-width="2.6" stroke-linejoin="round"/></svg>`;

export const logoMark = (cls = "logo-mark") =>
  LOGO_MARK_SVG.replace("<svg ", `<svg class="${cls}" aria-hidden="true" focusable="false" `);

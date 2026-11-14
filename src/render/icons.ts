/* ---------- ikoner (tynde linjer, 24×24) ---------- */

import { c } from "../ui/styles/classes";

const ICO_CLASS = c("ico");

const I = (body: string, extra = "") =>
  `<svg class="${ICO_CLASS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

const ICONS = {
  sun: I(
    `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  ),
  moon: I(`<path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z"/>`),
  cloud: I(
    `<path d="M7 18h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.2A3.4 3.4 0 0 0 7 18Z"/>`,
  ),
  rain: I(
    `<path d="M7 15h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.2A3.4 3.4 0 0 0 7 15Z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>`,
  ),
  snow: I(`<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>`),
  home: I(
    `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>`,
  ),
  sofa: I(
    `<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 11a2 2 0 0 1 2 2v2h14v-2a2 2 0 0 1 4 0v5H1v-5a2 2 0 0 1 2-2Z"/><path d="M4 18v2M20 18v2"/>`,
  ),
  counter: I(
    `<path d="M3 8h18"/><path d="M4.5 8V21M19.5 8v13"/><path d="M7.5 8V4h4v4"/><circle cx="16" cy="12" r="1.6"/>`,
  ),
  bed: I(
    `<path d="M3 19V7"/><path d="M3 16h18v3"/><path d="M6 16v-4h6a2 2 0 0 1 2 2v2"/><path d="M14 12h4a3 3 0 0 1 3 3v1"/>`,
  ),
  desk: I(
    `<path d="M3 8h18"/><path d="M4.5 8v12M19.5 8v12"/><rect x="8" y="4" width="8" height="4" rx="1"/><path d="M8 12h4"/>`,
  ),
  washer: I(
    `<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M8 6.5h.01M11 6.5h.01"/>`,
  ),
  door: I(
    `<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="14.5" cy="12" r=".8" fill="currentColor" stroke="none"/>`,
  ),
  shed: I(
    `<path d="M3 10 12 3l9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-6h6v6"/><path d="M9 15h6"/>`,
  ),
  stairs: I(`<path d="M3 20h4v-4h4v-4h4V8h4V4"/>`),
  fan: I(
    `<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-6 3.5-6 2 0 3 1.6 2.2 3.4C16.9 9.4 14.6 10 12 10Z"/><path d="M14 12c4 0 6 1 6 3.5 0 2-1.6 3-3.4 2.2C14.6 16.9 14 14.6 14 12Z"/><path d="M10 12c0 2-.6 4.3-2.4 5.1C5.8 17.9 4 17 4 15c0-2.5 2-3.5 6-3Z"/><path d="M10 14c-4 0-6-1-6-3.5C4 8.5 5.6 7.5 7.4 8.3 9.4 9.1 10 11.4 10 14Z"/>`,
  ),
  drop: I(
    `<path d="M12 3c3.5 4.5 6 7.5 6 10.5A6 6 0 0 1 6 13.5C6 10.5 8.5 7.5 12 3Z"/>`,
  ),
  shield: I(
    `<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.4-3.6"/>`,
  ),
  bolt: I(`<path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z"/>`),
  solar: I(
    `<path d="M4 18h16"/><path d="m6 18 1.5-7h9L18 18"/><path d="M9 18v3M15 18v3"/><circle cx="12" cy="4.5" r="2"/><path d="M12 1v1M12 7v1M8.8 4.5H7.5M16.5 4.5h-1.3"/>`,
  ),
  battery: I(
    `<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10v4"/><path d="M6 10v4M9.5 10v4M13 10v4"/>`,
  ),
  light: I(
    `<path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.8.8-1 1.5-1 2H9c0-.5-.2-1.2-1-2Z"/>`,
  ),
  heat: I(
    `<path d="M7 21c-2-3 2-4 0-7M12 21c-2-3 2-4 0-7M17 21c-2-3 2-4 0-7"/><path d="M6 10a6 6 0 0 1 12 0"/>`,
  ),
  network: I(
    `<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3h12V9M12 12v3"/>`,
  ),
  chart: I(`<path d="M3 20h18"/><path d="M5 17V9M10 17V5M15 17v-6M20 17V7"/>`),
  bell: I(
    `<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>`,
  ),
  alert: I(
    `<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/>`,
  ),
  check: I(`<path d="m4 12.5 5 5L20 6.5"/>`),
  close: I(`<path d="M6 6l12 12M18 6 6 18"/>`),
  menu: I(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  arrow: I(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  chevron: I(`<path d="m9 5 7 7-7 7"/>`),
  plus: I(`<path d="M12 5v14M5 12h14"/>`),
  minus: I(`<path d="M5 12h14"/>`),
  play: I(`<path d="M8 5v14l11-7L8 5Z"/>`),
  pause: I(`<path d="M8 5v14M16 5v14"/>`),
  car: I(
    `<path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 16Z"/><path d="M4 16v3h3v-3M17 16v3h3v-3"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/>`,
  ),
  plug: I(
    `<path d="M9 3v5M15 3v5"/><path d="M6 8h12v4a6 6 0 0 1-12 0V8Z"/><path d="M12 18v3"/>`,
  ),
  filter: I(`<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>`),
  spark: I(
    `<path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"/>`,
  ),
  thermometer: I(
    `<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 8v7"/>`,
  ),
  water: I(
    `<path d="M3 8c3-2 5 2 9 0s6 2 9 0M3 13c3-2 5 2 9 0s6 2 9 0M3 18c3-2 5 2 9 0s6 2 9 0"/>`,
  ),
  wind: I(
    `<path d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>`,
  ),
  info: I(
    `<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none"/>`,
  ),
  flame: I(
    `<path d="M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-2.5-1-4 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 5-6 6-11Z"/>`,
  ),
  clock: I(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  map: I(
    `<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>`,
  ),
  percent: I(
    `<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>`,
  ),
};

type IconName = keyof typeof ICONS;

export function icon(name: string, cls = ""): string {
  const s = ICONS[name as IconName] || ICONS.info;
  return cls
    ? s.replace(`class="${ICO_CLASS}"`, `class="${ICO_CLASS} ${cls}"`)
    : s;
}

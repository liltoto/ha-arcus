import { FONT_FACE_CSS } from "./fonts";

/**
 * Arcus shadow-root styles.
 *
 * Ported verbatim from the audited prototype CSS, plus the density tokens and
 * embedded @font-face rules.
 */
export const STYLES = `${FONT_FACE_CSS}
/* Arcus — alt er eget design, ingen HA-kort inde i oplevelsen */

:host {
  /* Audited spacing scale. Defaults reproduce the current design. */
  --arcus-card-pad: 20px;
  --arcus-grid-gap: 12px;
  --arcus-section-gap: clamp(32px, 3vw, 40px);
  --arcus-sheet-pad: 24px;
  /* Height of the sparkline footer band in vitals and room cards. Text is
     padded clear of it so charts never run behind labels. */
  --arcus-spark-vital: 26px;
  --arcus-spark-room: 46px;

  display: block;
  height: calc(100dvh - var(--header-height, 56px));
  min-height: 560px;
  background: #080b0f;
  color: #f2ebe1;
}

:host([data-density="compact"]) {
  --arcus-card-pad: 16px;
  --arcus-grid-gap: 10px;
  --arcus-section-gap: 32px;
  --arcus-sheet-pad: 20px;
}

@media (max-width: 560px) {
  :host {
    --arcus-card-pad: 16px;
    /* The prototype keeps its 12px grid gap on phones; 10px is compact-only. */
    --arcus-sheet-pad: 16px;
  }
}

/* The card sets density on .app; mirror the tokens there for nested content. */
.app[data-density="compact"] {
  --arcus-card-pad: 16px;
  --arcus-grid-gap: 10px;
  --arcus-section-gap: 32px;
  --arcus-sheet-pad: 20px;
}

* { box-sizing: border-box; }

.app {
  --bg-0: #080b0f;
  --bg-1: #0d1117;
  --bg-2: #121821;
  --bg-3: #1a2230;
  --panel: rgba(255, 255, 255, 0.028);
  --panel-2: rgba(255, 255, 255, 0.05);
  --line: rgba(242, 235, 225, 0.09);
  --line-strong: rgba(242, 235, 225, 0.18);
  --text: #f2ebe1;
  --text-2: #c9c2b8;
  --muted: #8a929e;
  --brass: #d8a657;
  --amber: #e8b86d;
  --sky: #7fafc4;
  --sage: #8fb08b;
  --coral: #e0785e;
  --plum: #9a86c8;
  --paper: #f4efe6;
  --glow: rgba(154, 134, 200, 0.2);
  --sky-a: #0a0e14;
  --sky-b: #151b25;
  --accent: #d8a657;
  --serif: "Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: "SFMono-Regular", "Cascadia Code", "Roboto Mono", ui-monospace, monospace;
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--bg-0);
  color: var(--text);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.app.light {
  --bg-0: #efe8dc;
  --bg-1: #f7f2e9;
  --bg-2: #fbf7f0;
  --bg-3: #e7dfd2;
  --panel: rgba(29, 27, 24, 0.025);
  --panel-2: rgba(29, 27, 24, 0.05);
  --line: rgba(29, 27, 24, 0.1);
  --line-strong: rgba(29, 27, 24, 0.2);
  --text: #1d1b18;
  --text-2: #4a463f;
  --muted: #7a7368;
  --brass: #a9772f;
  --amber: #b97f2e;
  --sky: #4f8499;
  --sage: #597b57;
  --coral: #c25c43;
  --plum: #6f5aa3;
  --glow: rgba(216, 166, 87, 0.22);
  --sky-a: #f6efe2;
  --sky-b: #efe2cd;
}

.app[data-atmo="night"] {
  --glow: rgba(154, 134, 200, 0.2);
  --sky-a: #080b10;
  --sky-b: #141a24;
  --accent: #9a86c8;
}
.app[data-atmo="dawn"] {
  --glow: rgba(232, 168, 124, 0.28);
  --sky-a: #0d0b10;
  --sky-b: #35232c;
  --accent: #e8a87c;
}
.app[data-atmo="day"] {
  --glow: rgba(216, 166, 87, 0.26);
  --sky-a: #0a1013;
  --sky-b: #1a2626;
  --accent: #d8a657;
}
.app[data-atmo="dusk"] {
  --glow: rgba(224, 120, 94, 0.28);
  --sky-a: #0d0a0d;
  --sky-b: #351e26;
  --accent: #e0785e;
}

.app.light[data-atmo="night"] {
  --sky-a: #e9e2d8;
  --sky-b: #d9d2cb;
  --accent: #6f5aa3;
}
.app.light[data-atmo="dawn"] {
  --sky-a: #f8ead9;
  --sky-b: #f1d7c4;
  --accent: #a9772f;
}
.app.light[data-atmo="day"] {
  --sky-a: #f7f0e2;
  --sky-b: #e8ddc8;
  --accent: #a9772f;
}
.app.light[data-atmo="dusk"] {
  --sky-a: #f4e2d9;
  --sky-b: #e6c8c0;
  --accent: #c25c43;
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.ico {
  width: 20px;
  height: 20px;
  display: block;
  flex: 0 0 auto;
}

/* ---------- himmel & ramme ---------- */
.sky {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(90% 60% at 50% 0%, var(--glow), transparent 58%),
    linear-gradient(180deg, var(--sky-a) 0%, var(--sky-b) 46%, var(--bg-0) 100%);
  transition: background 1.2s ease;
  pointer-events: none;
}

.sky::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
  overscroll-behavior: contain;
}

.scroll::-webkit-scrollbar { width: 6px; }
.scroll::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 99px; }
.scroll::-webkit-scrollbar-track { background: transparent; }

.wrap {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 48px);
}

/* ---------- topbar ---------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  background: linear-gradient(180deg, rgba(8, 11, 15, 0.82), rgba(8, 11, 15, 0.38) 70%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.app.light .topbar {
  background: linear-gradient(180deg, rgba(239, 232, 220, 0.86), rgba(239, 232, 220, 0.42) 70%, transparent);
}

.topbar-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 48px);
  height: 58px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  text-align: left;
}

.brand-mark {
  width: 26px;
  height: 26px;
  color: var(--text);
  opacity: 0.9;
}

.brand-word {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3em;
  line-height: 1;
}

.brand-sub {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--muted);
}

.topbar-date {
  flex: 1;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.025);
  white-space: nowrap;
  flex: 0 0 auto;
}

.pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: var(--sage);
  box-shadow: 0 0 0 3px rgba(143, 176, 139, 0.14);
}

.pill.warn .dot {
  background: var(--coral);
  box-shadow: 0 0 0 3px rgba(224, 120, 94, 0.16);
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.icon-btn:hover {
  color: var(--text);
  border-color: var(--line-strong);
  background: var(--panel-2);
}

.icon-btn .ico { width: 17px; height: 17px; }

/* ---------- hero ---------- */
.hero {
  padding-top: clamp(16px, 2.5vw, 24px);
  position: relative;
}

.hero-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  row-gap: 12px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 9px;
  transition: color 0.2s ease;
}

button.eyebrow:hover { color: var(--text-2); }
.eyebrow-arrow .ico { width: 11px; height: 11px; opacity: 0.6; }

.greeting {
  font-family: var(--serif);
  font-weight: 500;
  font-size: clamp(36px, 5.2vw, 66px);
  line-height: 0.95;
  letter-spacing: -0.025em;
  margin: 0;
}

.greeting em {
  font-style: italic;
  color: var(--accent);
  font-weight: 400;
}

.hero-date {
  margin-top: 11px;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.weather {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-left: auto;
  text-align: right;
  padding-bottom: 4px;
}

.weather .ico {
  width: 34px;
  height: 34px;
  color: var(--accent);
  opacity: 0.95;
}

.weather-temp {
  font-family: var(--serif);
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1;
  letter-spacing: -0.02em;
}

.weather-sub {
  margin-top: 4px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: capitalize;
}

/* ---------- døgnbuen ---------- */
.arc-wrap {
  position: relative;
  margin-top: clamp(12px, 1.4vw, 16px);
  width: 100%;
  aspect-ratio: 1000 / 300;
  max-height: 330px;
  touch-action: pan-y;
  user-select: none;
}

.arc-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.app[data-atmo="night"] [data-solar-area] { opacity: 0.55; }
.app[data-atmo="night"] [data-solar-line] { opacity: 0.55; }
.app[data-atmo="dusk"] [data-solar-area] { opacity: 0.75; }

.arc-glow {
  position: absolute;
  width: clamp(160px, 34vw, 460px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, var(--glow) 0%, transparent 66%);
  filter: blur(12px);
  opacity: 0.95;
  pointer-events: none;
  transition: left 0.8s ease, top 0.8s ease, background 1s ease;
}

.orb {
  position: absolute;
  width: clamp(22px, 3.1vw, 38px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: none;
  transition: left 0.8s ease, top 0.8s ease, background 1s ease, box-shadow 1s ease;
  z-index: 2;
}

.app[data-atmo="day"] .orb,
.app[data-atmo="dawn"] .orb {
  background: radial-gradient(circle at 38% 35%, #fffaf0 0%, #f2d28f 48%, #d8a657 100%);
  box-shadow: 0 0 24px rgba(232, 184, 109, 0.55), 0 0 70px rgba(216, 166, 87, 0.28);
}

.app[data-atmo="night"] .orb,
.app[data-atmo="dusk"] .orb {
  background: transparent;
  box-shadow: inset -7px -4px 0 0 #e8e2d6;
  filter: drop-shadow(0 0 16px rgba(232, 226, 214, 0.38));
}

.app.light[data-atmo="night"] .orb,
.app.light[data-atmo="dusk"] .orb {
  box-shadow: inset -7px -4px 0 0 #6f6a61;
  filter: drop-shadow(0 0 12px rgba(74, 70, 63, 0.2));
}

.stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1s ease;
}

.app[data-atmo="night"] .stars,
.app[data-atmo="dawn"] .stars,
.app[data-atmo="dusk"] .stars { opacity: 0.7; }

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #f2ebe1;
  animation: twinkle 4.5s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.8; }
}

.arc-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.arc-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
  transition: color 0.3s ease, opacity 0.3s ease;
}

.arc-label .t {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-2);
}

.arc-label.next {
  color: var(--accent);
}

.arc-label.next .t {
  color: var(--text);
  font-weight: 600;
}

.arc-label.sun {
  color: var(--text-2);
  opacity: 0.8;
}

.now-needle {
  position: absolute;
  top: 7%;
  bottom: 17%;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--accent) 22%, var(--accent) 78%, transparent);
  opacity: 0.55;
  pointer-events: none;
  z-index: 1;
}

.now-bead {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--text);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent), 0 0 20px var(--accent);
  pointer-events: none;
  z-index: 3;
}

.arc-hours {
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: -2px;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  opacity: 0.55;
  pointer-events: none;
}

.arc-readout {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: rgba(8, 11, 15, 0.55);
  backdrop-filter: blur(10px);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 3;
}

.app.light .arc-readout { background: rgba(247, 242, 233, 0.7); }

.arc-readout.show { opacity: 1; }
.arc-readout b { color: var(--text); font-weight: 600; }

.arc-readout .sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--muted);
}

/* ---------- vitals ---------- */
.vitals {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.vital {
  position: relative;
  overflow: hidden;
  min-height: 94px;
  padding: 14px 16px calc(var(--arcus-spark-vital) + 10px);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.008));
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.vital:hover {
  border-color: var(--line-strong);
  transform: translateY(-1px);
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.012));
}

.vital-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.vital-value {
  position: relative;
  z-index: 2;
  margin-top: 6px;
  font-family: var(--serif);
  font-size: clamp(24px, 2.6vw, 32px);
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.vital-value small {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin-left: 3px;
}

.vital-sub {
  position: relative;
  z-index: 2;
  margin-top: 5px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.vital-spark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: var(--arcus-spark-vital);
  opacity: 0.55;
  pointer-events: none;
}

.vital-ring {
  position: absolute;
  right: 14px;
  top: 50%;
  width: 38px;
  height: 38px;
  transform: translateY(-50%);
  opacity: 0.9;
}

.weather-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.weather-strip:empty { display: none; }

.wday {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.wday .wname { color: var(--text-2); }
.wday .wico { display: inline-flex; color: var(--accent); opacity: 0.8; }
.wday .wico .ico { width: 14px; height: 14px; }
.wday .wtemps { display: inline-flex; gap: 4px; color: var(--muted); }
.wday .wtemps b { color: var(--text); font-weight: 500; }

/* ---------- alert band ---------- */
.alert-band {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--coral) 34%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--coral) 8%, transparent);
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.alert-band:hover {
  background: color-mix(in srgb, var(--coral) 12%, transparent);
  border-color: color-mix(in srgb, var(--coral) 48%, transparent);
}

.alert-band .ico { color: var(--coral); width: 18px; height: 18px; }

.alert-text {
  flex: 1;
  font-size: 12px;
  color: var(--text-2);
}

.alert-text b {
  color: var(--text);
  font-weight: 600;
}

.alert-count {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--coral);
  text-transform: uppercase;
}

/* ---------- sektioner ---------- */
.section { margin-top: var(--arcus-section-gap); }

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.section-head .kicker {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}

.section-head h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(24px, 2.5vw, 32px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1;
}

.section-head .meta {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-align: right;
  line-height: 1.6;
}

.section-head .meta b { color: var(--text-2); font-weight: 500; }

/* ---------- rum ---------- */
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--arcus-grid-gap);
}

.room-card {
  position: relative;
  overflow: hidden;
  min-height: 168px;
  padding: var(--arcus-card-pad) var(--arcus-card-pad)
    calc(var(--arcus-spark-room) + 8px);
  border: 1px solid var(--line);
  border-radius: 20px;
  background:
    radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--room) 13%, transparent), transparent 58%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.006));
  text-align: left;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.22);
}

.room-card.wide { grid-column: span 2; }

.room-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.room-name {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.05;
}

.room-kind {
  margin-top: 4px;
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--muted);
}

.room-icon {
  width: 28px;
  height: 28px;
  color: var(--room);
  opacity: 0.85;
}

.room-icon .ico { width: 28px; height: 28px; }

.room-main {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  margin-top: 18px;
}

.room-temp {
  font-family: var(--serif);
  font-size: clamp(38px, 4.2vw, 52px);
  line-height: 0.9;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}

.room-temp sup {
  font-size: 14px;
  vertical-align: top;
  line-height: 1;
  color: var(--muted);
  margin-left: 2px;
}

.room-temp.off { color: var(--muted); }

.room-status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding-bottom: 4px;
}

.room-status span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.room-status .sdot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--sage);
}

.room-status .sdot.off { background: var(--muted); opacity: 0.5; }
.room-status .sdot.warn { background: var(--coral); }

.room-spark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: var(--arcus-spark-room);
  opacity: 0.5;
  pointer-events: none;
}

.room-open {
  position: absolute;
  right: var(--arcus-card-pad);
  bottom: calc(var(--arcus-spark-room) + 10px);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.room-card:hover .room-open { opacity: 1; transform: none; }

.room-card.wide .room-main { margin-top: 22px; }

/* ---------- kapitler ---------- */
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--arcus-grid-gap);
}

.chapter {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 156px;
  padding: var(--arcus-card-pad);
  border: 1px solid var(--line);
  border-radius: 20px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.032), rgba(255, 255, 255, 0.006));
  text-align: left;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.chapter:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.22);
}

.chapter.large {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 311px;
}

.chapter .num {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--muted);
  opacity: 0.8;
}

.chapter .ch-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.chapter .ch-icon {
  width: 22px;
  height: 22px;
  color: var(--accent);
  opacity: 0.8;
}

.chapter h3 {
  margin: 8px 0 0;
  font-family: var(--serif);
  font-size: 21px;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1;
}

.chapter.large h3 { font-size: 29px; }

.chapter .sum {
  margin-top: 8px;
  font-size: 10px;
  line-height: 1.55;
  color: var(--text-2);
  letter-spacing: 0.01em;
}

.chapter .sum b { color: var(--text); font-weight: 600; }

.chapter .ch-art {
  position: relative;
  width: 100%;
  height: 62px;
  margin-top: auto;
  padding-top: 10px;
  pointer-events: none;
}

.chapter.large .ch-art { height: 130px; }

.chapter .ch-art svg { width: 100%; height: 100%; overflow: visible; }

.chapter .big-num {
  font-family: var(--serif);
  font-size: 42px;
  line-height: 0.95;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.chapter .big-num small {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.chapter .ch-foot {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.chapter .ch-foot b { color: var(--text-2); font-weight: 500; }

.price-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100%;
}

.price-bars i {
  flex: 1;
  min-width: 2px;
  border-radius: 2px 2px 1px 1px;
  background: var(--bar, var(--brass));
  opacity: 0.75;
}

.light-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-content: flex-end;
  height: 100%;
}

.light-dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: transparent;
}

.light-dots i.on {
  background: var(--brass);
  border-color: var(--brass);
  box-shadow: 0 0 8px rgba(216, 166, 87, 0.45);
}

.zone-strip {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 100%;
}

.zone-strip i {
  flex: 1;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--sage), color-mix(in srgb, var(--sage) 30%, transparent));
  opacity: 0.55;
}

.zone-strip i.warn { background: linear-gradient(180deg, var(--coral), color-mix(in srgb, var(--coral) 30%, transparent)); }

.sec-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-end;
  height: 100%;
}

.sec-dots i {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--sage) 55%, transparent);
}

.sec-dots i.open {
  background: var(--coral);
  border-color: var(--coral);
  box-shadow: 0 0 10px rgba(224, 120, 94, 0.45);
}

/* ---------- hurtige handlinger ---------- */
.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: var(--panel);
  color: var(--text-2);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.quick .ico { width: 16px; height: 16px; color: var(--muted); }
.quick:hover { color: var(--text); border-color: var(--line-strong); background: var(--panel-2); }
.quick:hover .ico { color: var(--accent); }
.quick.on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.quick.on .ico { color: var(--accent); }

/* ---------- footer ---------- */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 40px 0 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.footer .mark {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.footer .mark .ico { width: 13px; height: 13px; opacity: 0.7; }

/* ---------- scrim + sheet ---------- */
.scrim {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(3, 5, 8, 0.52);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.scrim.open { opacity: 1; pointer-events: auto; }

arcus-sheets {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.sheet {
  position: absolute;
  z-index: 70;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

@media (min-width: 900px) {
  .sheet {
    top: 14px;
    right: 14px;
    bottom: 14px;
    width: min(590px, 48vw);
    border-radius: 24px;
    transform: translateX(calc(100% + 30px));
  }
  .sheet.open { transform: none; }
}

@media (max-width: 899px) {
  .sheet {
    left: 0;
    right: 0;
    bottom: 0;
    height: 93%;
    border-radius: 24px 24px 0 0;
    border-bottom: 0;
    transform: translateY(100%);
  }
  .sheet.open { transform: none; }
}

.sheet-grab {
  display: none;
  width: 38px;
  height: 4px;
  border-radius: 99px;
  background: var(--line-strong);
  margin: 9px auto 0;
  flex: 0 0 auto;
}

@media (max-width: 899px) {
  .sheet-grab { display: block; }
}

.sheet-head {
  position: relative;
  flex: 0 0 auto;
  padding: 24px var(--arcus-sheet-pad) 16px;
  background:
    radial-gradient(120% 130% at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 58%),
    var(--bg-1);
  border-bottom: 1px solid var(--line);
}

.sheet-kicker {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 7px;
}

.sheet-title {
  margin: 0;
  padding-right: 64px;
  font-family: var(--serif);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.sheet-sum {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-2);
  max-width: 46ch;
}

.sheet-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.02);
}

.sheet-close:hover { color: var(--text); border-color: var(--line-strong); }

.sheet-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
  padding: 8px var(--arcus-sheet-pad) 48px;
}

.sheet-scroll::-webkit-scrollbar { width: 5px; }
.sheet-scroll::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 99px; }

.sheet-tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 12px var(--arcus-sheet-pad) 12px;
  overflow-x: auto;
  background: var(--bg-1);
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}
.sheet-tabs::-webkit-scrollbar { display: none; }

.tab {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab.active {
  color: var(--bg-0);
  background: var(--text);
  border-color: var(--text);
}

.app.light .tab.active { color: var(--paper); }

.tab:hover:not(.active) { color: var(--text-2); border-color: var(--line-strong); }

.block { margin-top: 24px; }

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.block-label {
  font-size: 10px;
  letter-spacing: 0.17em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Standalone section labels sit directly above readings or charts; the labels
   inside .block-head already get their spacing from the head itself. */
.block > .block-label { margin-bottom: 12px; }

.block-label b { color: var(--text-2); font-weight: 500; }

.block-note {
  margin-top: 8px;
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
}

.hairline { height: 1px; background: var(--line); margin: 18px 0; }

.readings {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.reading {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--panel);
}

.reading .v {
  font-family: var(--serif);
  font-size: clamp(22px, 2.6vw, 28px);
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.reading .v small { font-family: var(--sans); font-size: 10px; color: var(--muted); margin-left: 2px; }
.reading .l { margin-top: 6px; font-size: 10px; letter-spacing: 0.11em; text-transform: uppercase; color: var(--muted); }

.big-read {
  font-family: var(--serif);
  font-size: clamp(46px, 8vw, 66px);
  line-height: 0.9;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.big-read small { font-family: var(--sans); font-size: 12px; color: var(--muted); margin-left: 4px; letter-spacing: 0.03em; }

.chart-box {
  position: relative;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  padding: 12px 12px 8px;
  overflow: hidden;
}

/* A chart that follows a readings grid needs its own breathing room; the
   grid has no bottom margin and the chart has no top margin. */
.readings + .chart-box { margin-top: 16px; }

.chart-empty {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--muted);
}

.chart-box.no-data .chart-empty { display: flex; }
.chart-box.no-data svg { opacity: 0.18; }

.toast {
  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: 90;
  transform: translate(-50%, 16px);
  padding: 9px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 99px;
  background: var(--bg-2);
  color: var(--text-2);
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast.show { opacity: 1; transform: translate(-50%, 0); }

/* ---------- graph hover readout ---------- */
[data-graph] { pointer-events: auto; }

.graph-tip {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 95;
  min-width: 64px;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-1) 94%, transparent);
  color: var(--text);
  font-family: var(--sans);
  font-size: 11px;
  line-height: 1.35;
  letter-spacing: 0.01em;
  pointer-events: none;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.38);
  opacity: 0;
  transform: translateY(3px);
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.graph-tip.show { opacity: 1; transform: none; }

.graph-tip b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.graph-tip .gt-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.graph-tip .gt-row + .gt-row { margin-top: 3px; }

.graph-tip .gt-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c, var(--accent));
}

.graph-tip .gt-l {
  color: var(--muted);
  margin-right: auto;
}

.graph-tip .gt-v { margin-left: auto; }

.graph-tip .gt-t {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.06em;
}

.graph-cursor {
  position: fixed;
  z-index: 90;
  width: 1px;
  background: var(--line-strong);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.graph-cursor.show { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .graph-tip,
  .graph-cursor { transition: none; }
}

.chart-box svg { display: block; width: 100%; height: auto; overflow: visible; }

.chart-cap {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
  margin-top: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 9px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.03em;
}

.legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c, var(--accent));
}

.list { border-top: 1px solid var(--line); }

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  min-height: 48px;
}

.row .row-main { flex: 1; min-width: 0; }

.row .row-name {
  font-size: 12px;
  color: var(--text);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row .row-sub {
  margin-top: 2px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.03em;
}

.row .row-val {
  font-family: var(--serif);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.row .row-val small { font-family: var(--sans); font-size: 10px; color: var(--muted); margin-left: 2px; }

.row .ico { color: var(--muted); }

.row.on .ico { color: var(--accent); }

/* ---------- controls ---------- */
.toggle {
  position: relative;
  width: 40px;
  height: 23px;
  flex: 0 0 auto;
  border-radius: 99px;
  border: 1px solid var(--line-strong);
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--muted);
  transition: transform 0.22s ease, background 0.22s ease;
}

.toggle.on { background: color-mix(in srgb, var(--accent) 24%, transparent); border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.toggle.on::after { transform: translateX(17px); background: var(--accent); }

.app.light .toggle.on::after { background: var(--bg-0); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid var(--line-strong);
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}

.btn:hover { color: var(--text); border-color: var(--text-2); background: var(--panel-2); }

.btn.primary {
  color: var(--bg-0);
  background: var(--text);
  border-color: var(--text);
}

.app.light .btn.primary { color: var(--paper); }
.btn.primary:hover { opacity: 0.9; color: var(--bg-0); }

.btn.danger {
  color: var(--coral);
  border-color: color-mix(in srgb, var(--coral) 40%, transparent);
  background: color-mix(in srgb, var(--coral) 8%, transparent);
}

.btn.small { height: 32px; padding: 0 12px; font-size: 10px; }
.btn .ico { width: 15px; height: 15px; }

.btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.stepper button {
  width: 34px;
  height: 34px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
  transition: all 0.18s ease;
}

.stepper button:hover { color: var(--text); background: var(--panel-2); }
.stepper button .ico { width: 15px; height: 15px; }

.stepper .val {
  min-width: 56px;
  text-align: center;
  font-family: var(--serif);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.stepper .val small { font-family: var(--sans); font-size: 10px; color: var(--muted); }

.seg {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.02);
  gap: 2px;
}

.seg button {
  height: 28px;
  padding: 0 12px;
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  transition: all 0.2s ease;
}

.seg button.active { background: var(--panel-2); color: var(--text); }
.seg button:hover:not(.active) { color: var(--text-2); }

input[type="range"].range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 22px;
  background: transparent;
  cursor: pointer;
}

input[type="range"].range::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent) var(--p, 0%), var(--line-strong) var(--p, 0%), var(--line-strong) 100%);
}

input[type="range"].range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -6px;
  border-radius: 50%;
  background: var(--text);
  border: 2px solid var(--bg-1);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
}

input[type="range"].range::-moz-range-track { height: 2px; background: var(--line-strong); }
input[type="range"].range::-moz-range-progress { height: 2px; background: var(--accent); }
input[type="range"].range::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 50%; background: var(--text); }

.light-row .slider-wrap {
  margin: 2px 0 8px 0;
  padding-left: 32px;
}

.light-row .slider-wrap .pct {
  font-size: 10px;
  color: var(--muted);
  text-align: right;
  margin-top: -2px;
}

.slider-line { display: flex; align-items: center; gap: 10px; }
.slider-line .ico { width: 14px; height: 14px; color: var(--muted); }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 32px 20px;
  border: 1px dashed var(--line-strong);
  border-radius: 16px;
  text-align: center;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.empty .ico { width: 26px; height: 26px; opacity: 0.6; }

.unavailable { opacity: 0.5; }

.status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.03em;
}

.status-line .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sage); }
.status-line .dot.warn { background: var(--coral); }
.status-line .dot.idle { background: var(--muted); }

/* ---------- særlige visualiseringer ---------- */
.flow-wrap { position: relative; padding: 10px 0 2px; }
.flow-wrap svg { width: 100%; height: auto; display: block; }

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 118px;
  margin-top: 9px;
}

.bar-chart i {
  flex: 1;
  min-width: 3px;
  border-radius: 2px 2px 0 0;
  opacity: 0.72;
  transition: opacity 0.2s ease;
}

.bar-chart i.now {
  opacity: 1;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.day-bars {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 132px;
  margin-top: 9px;
  padding: 0 2px;
}

.day-bars .day {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.day-bars .val {
  font-family: var(--serif);
  font-size: 11px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.day-bars .bar {
  width: 100%;
  max-width: 26px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--sage), color-mix(in srgb, var(--sage) 30%, transparent));
  opacity: 0.65;
  min-height: 4px;
}

.day-bars .day.today .bar {
  background: linear-gradient(180deg, var(--amber), color-mix(in srgb, var(--amber) 30%, transparent));
  opacity: 1;
}

.day-bars .day-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.day-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.light-details {
  border-bottom: 1px solid var(--line);
}

.light-details summary {
  cursor: pointer;
  padding: 12px 0 10px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  list-style: none;
}

.light-details summary::-webkit-details-marker { display: none; }
.light-details summary::before {
  content: "+";
  display: inline-block;
  width: 14px;
  color: var(--accent);
}
.light-details[open] summary::before { content: "–"; }

.select {
  appearance: none;
  -webkit-appearance: none;
  max-width: 150px;
  padding: 7px 26px 7px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--panel);
  color: var(--text-2);
  font: inherit;
  font-size: 10px;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position: calc(100% - 13px) 13px, calc(100% - 9px) 13px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}

.flow-values {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  margin: -8px 0 0;
  padding: 0 2px;
}

.flow-values span {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.flow-values b {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.flow-values small {
  font-size: 7px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.air-flow .flow-val { font-size: 15px; }

.house-wrap {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
}

.house-wrap .legend { padding: 4px 4px 0; }

.flow-node { fill: var(--panel-2); stroke: var(--line-strong); stroke-width: 1; }.flow-label { font-family: var(--sans); font-size: 8px; letter-spacing: 0.12em; fill: var(--muted); text-transform: uppercase; }
.flow-val { font-family: var(--serif); font-size: 17px; fill: var(--text); }
.flow-unit { font-family: var(--sans); font-size: 7px; fill: var(--muted); }

.house-svg { width: 100%; height: auto; display: block; }
.house-room { fill: rgba(255, 255, 255, 0.022); stroke: var(--line); stroke-width: 1; }
.house-name { font-family: var(--sans); font-size: 7.5px; letter-spacing: 0.1em; fill: var(--muted); text-transform: uppercase; }
.house-dot { fill: var(--sage); }
.house-dot.open { fill: var(--coral); }

.battery-list .bar {
  width: 64px;
  height: 4px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
}

.battery-list .bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--sage);
}

.battery-list .bar i.warn { background: var(--coral); }
.battery-list .bar i.mid { background: var(--brass); }

.prayer-list .row { min-height: 40px; }

.prayer-list .row.next .row-name { color: var(--accent); font-weight: 600; }

.price-list .row { min-height: 42px; }

.mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mini-stat {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
}

.mini-stat .k { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.mini-stat .v { margin-top: 5px; font-family: var(--serif); font-size: 23px; line-height: 1; font-variant-numeric: tabular-nums; }
.mini-stat .v small { font-family: var(--sans); font-size: 10px; color: var(--muted); margin-left: 2px; }

.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.chip {
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.chip.on { color: var(--text); border-color: var(--line-strong); background: var(--panel-2); }
.chip.crit { color: var(--coral); border-color: color-mix(in srgb, var(--coral) 40%, transparent); background: color-mix(in srgb, var(--coral) 8%, transparent); }
.chip.warn { color: var(--brass); border-color: color-mix(in srgb, var(--brass) 40%, transparent); background: color-mix(in srgb, var(--brass) 7%, transparent); }
.chip.info { color: var(--sky); border-color: color-mix(in srgb, var(--sky) 35%, transparent); background: color-mix(in srgb, var(--sky) 7%, transparent); }

.alert-row { cursor: pointer; }
.alert-row:hover .row-name { color: var(--text); }
.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: var(--sky);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--sky) 12%, transparent);
}
.alert-dot.crit { background: var(--coral); box-shadow: 0 0 0 4px color-mix(in srgb, var(--coral) 14%, transparent); }
.alert-dot.warn { background: var(--brass); box-shadow: 0 0 0 4px color-mix(in srgb, var(--brass) 12%, transparent); }
.row-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.row-link .ico { width: 12px; height: 12px; }
.alert-row:hover .row-link { color: var(--accent); }

.note {
  padding: 14px 16px;
  border-left: 2px solid var(--line-strong);
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
}

.note b { color: var(--text-2); font-weight: 500; }

.confirm {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px calc(-1 * var(--arcus-sheet-pad)) -48px;
  padding: 12px var(--arcus-sheet-pad) calc(12px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--bg-1) 90%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--text-2);
}

.confirm .txt { flex: 1; }

/* ---------- responsivt ---------- */
@media (max-width: 1100px) {
  .chapter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chapter.large { grid-column: span 2; }
  .room-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .topbar-date { display: none; }
  .hero-top { align-items: flex-start; }
  .weather { gap: 9px; }
  .weather .ico { width: 28px; height: 28px; }
  .vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vital { min-height: 86px; }
  .section { margin-top: 32px; }
  .section-head .meta { display: none; }
}

@media (max-width: 560px) {
  .wrap { padding-left: 16px; padding-right: 16px; }
  .topbar-inner { padding-left: 16px; padding-right: 16px; height: 52px; gap: 10px; }
  .brand-word { font-size: 11px; letter-spacing: 0.24em; }
  .brand-sub { font-size: 7px; }
  .topbar-right { gap: 6px; }
  .pill { height: 28px; padding: 0 10px; font-size: 9px; }
  .topbar-right .pill.name { display: none; }
  .hero { padding-top: 16px; }
  .greeting { font-size: clamp(32px, 9.5vw, 44px); }
  .hero-date { font-size: 11px; }
  .weather-temp { font-size: 26px; }
  .weather-sub { font-size: 9px; max-width: 16ch; }
  .arc-wrap { margin-top: 12px; }
  .arc-label { font-size: 7px; letter-spacing: 0.08em; }
  .arc-label .t { font-size: 8px; }
  .arc-label.opt { display: none; }
  .arc-label:not(.next):not(.sun) { display: none; }
  .arc-hours { font-size: 8px; }
  .vitals { gap: 8px; }
  .vital {
    min-height: 84px;
    padding: 12px 14px calc(var(--arcus-spark-vital) + 8px);
  }
  .vital-label { font-size: 8px; letter-spacing: 0.14em; }
  .vital-sub { font-size: 9px; }
  .vital-value { font-size: 24px; }
  .weather-strip { gap: 6px; padding: 10px 0; }
  .wday { gap: 4px; font-size: 8px; letter-spacing: 0.05em; }
  .wday .wico { display: none; }
  .wday .wtemps { font-size: 8px; }
  .room-card {
    min-height: 160px;
    padding: 16px 16px calc(var(--arcus-spark-room) + 8px);
  }
  .room-name { font-size: 17px; }
  .room-kind { font-size: 8px; letter-spacing: 0.13em; }
  .room-temp { font-size: 36px; }
  .room-main { gap: 8px; margin-top: 14px; }
  .room-status { gap: 4px 8px; }
  .room-status span { font-size: 8px; letter-spacing: 0.07em; }
  .room-icon { width: 23px; height: 23px; }
  .room-icon .ico { width: 23px; height: 23px; }
  .chapter { min-height: 148px; padding: 16px; }
  .chapter h3 { font-size: 19px; }
  .chapter.large h3 { font-size: 26px; }
  .chapter .sum { font-size: 9px; }
  .chapter .ch-foot { font-size: 9px; }
  .chapter .ch-art { height: 58px; }
  .chapter .big-num { font-size: 36px; }
  .section-head h2 { font-size: 25px; }
  .footer { font-size: 9px; letter-spacing: 0.06em; }
  .sheet-head { padding: 18px 16px 14px; }
  .sheet-close { top: 16px; right: 16px; }
  .sheet-scroll { padding-left: 16px; padding-right: 16px; }
  .sheet-tabs { margin: 0; padding-left: 16px; padding-right: 16px; }
  .confirm { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .readings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mini-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sheet-title { font-size: 32px; }
}

@media (min-width: 360px) and (max-width: 1100px) {
  .room-card[data-system="skur"] { grid-column: span 2; }
}

@media (max-width: 359px) {
  .room-grid { grid-template-columns: 1fr; }
  .room-card.wide { grid-column: span 1; }
  .chapter-grid { grid-template-columns: 1fr; }
  .chapter.large { grid-column: span 1; }
  .vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}


/* ---------- compact density ---------- */
.app[data-density="compact"] .chapter { padding: 16px; }
.app[data-density="compact"] .room-card {
  padding: 16px 16px calc(var(--arcus-spark-room) + 8px);
}
.app[data-density="compact"] .vital {
  padding: 12px 14px calc(var(--arcus-spark-vital) + 8px);
}
.app[data-density="compact"] .section { margin-top: 32px; }
.app[data-density="compact"] .room-grid,
.app[data-density="compact"] .chapter-grid { gap: 10px; }
.app[data-density="compact"] .ch-art { height: 56px; }
.app[data-density="compact"] .ch-art svg { height: 46px; }
.app[data-density="compact"] .sheet-head { padding: 18px 20px 14px; }
.app[data-density="compact"] .sheet-scroll { padding: 8px 20px 40px; }
.app[data-density="compact"] .sheet-tabs { margin: 0; padding: 10px 20px; }
.app[data-density="compact"] .block { margin-top: 20px; }
.app[data-density="compact"] .reading { padding: 11px 12px; }
.app[data-density="compact"] .mini-stat { padding: 12px 14px; }
.app[data-density="compact"] .quick { height: 40px; padding: 0 14px; }
`;

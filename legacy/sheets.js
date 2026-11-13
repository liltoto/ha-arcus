import {
  ROOMS,
  SYSTEM_CARDS,
  LIGHTS,
  HEATING,
  HEATING_RESERVE,
  CHAPTERS,
  NAV_ITEMS,
  PRAYERS,
  SUNRISE_ID,
  icon,
  fmtNum,
  fmtPrice,
  fmtTime,
  parseTs,
  priceColor,
  sparkPath,
  areaPath,
  downsample,
  seriesFromHistory,
  histTs,
  shortRoomName,
} from "./data.js";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function chart(specs, h = 130, opts = {}) {
  const list = Array.isArray(specs) ? specs : [typeof specs === "string" ? { key: specs } : specs];
  list.forEach((s) => { if (!s.color) s.color = "var(--accent)"; });
  const shared = opts.shared ?? list.length > 1;
  const gid = `g${String(list[0].key).replace(/[^a-z0-9]/gi, "")}`;
  return `<div class="chart-box">
    <svg viewBox="0 0 560 ${h}" preserveAspectRatio="none" data-chart-shared="${shared ? "1" : "0"}" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${list[0].color}" stop-opacity=".26"/>
        <stop offset="1" stop-color="${list[0].color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${[0.25, 0.5, 0.75].map((p) => `<line x1="0" y1="${h * p}" x2="560" y2="${h * p}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("")}
      <path data-chart-area="${list[0].key}" fill="url(#${gid})" d=""/>
      ${list.map((s) => `<path data-chart-line="${s.key}" fill="none" stroke="${s.color}" stroke-width="1.5" vector-effect="non-scaling-stroke" d=""/>`).join("")}
    </svg>
    <span class="chart-empty">Ingen data</span>
  </div>`;
}

function read(label, bind, value, unit = "") {
  return `<div class="reading"><div class="v"><span data-bind="${bind}">${value}</span><small>${unit}</small></div><div class="l">${label}</div></div>`;
}

function row(name, sub, right, opts = {}) {
  return `<div class="row ${opts.cls || ""}">
    ${opts.lead || ""}
    <div class="row-main"><div class="row-name">${name}</div>${sub ? `<div class="row-sub">${sub}</div>` : ""}</div>
    ${right || ""}
  </div>`;
}

function toggle(entity, act = "toggle-switch", onClass = true) {
  return `<button class="toggle" data-act="${act}" data-entity="${entity}" ${onClass ? `data-on="${entity}"` : `data-not-off="${entity}"`} aria-label="Skift"></button>`;
}

function stepper(entity, act, step = 0.5, bind) {
  return `<div class="stepper"><button data-act="${act}" data-entity="${entity}" data-step="${step}" data-dir="-1" aria-label="Ned">${icon("minus")}</button><span class="val" data-bind="${bind}">–</span><button data-act="${act}" data-entity="${entity}" data-step="${step}" data-dir="1" aria-label="Op">${icon("plus")}</button></div>`;
}

function lightRow(app, id, name, showSlider = true, sub = "") {
  const st = app._get(id);
  const on = st?.state === "on";
  const pct = on && st?.attributes?.brightness ? Math.round((st.attributes.brightness / 255) * 100) : 0;
  return `<div class="light-row">
    <div class="row">
      <button class="toggle ${on ? "on" : ""}" data-act="toggle-light" data-entity="${id}" data-on="${id}" aria-label="Tænd eller sluk ${esc(name)}"></button>
      <div class="row-main"><div class="row-name">${esc(name)}</div><div class="row-sub" data-bind="ls_${id}">${on ? `Tændt · ${pct} %` : "Slukket"}</div></div>
      <span class="row-val">${on ? pct + " %" : "–"}</span>
    </div>
    ${showSlider ? `<div class="slider-wrap"><div class="slider-line">${icon("sun")}<input class="range" type="range" min="0" max="100" step="1" data-range-entity="${id}" value="${pct}" style="--p:${pct}%"></div><div class="pct">${on ? pct + " %" : "slukket"}</div></div>` : ""}
  </div>`;
}

function lastChanged(app, id) {
  const d = parseTs(app._get(id)?.last_changed);
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 2) return "lige nu";
  if (mins < 60) return `for ${mins} min siden`;
  const h = Math.round(mins / 60);
  if (h < 24) return `for ${h} t siden`;
  return `${Math.round(h / 24)} d siden`;
}

function priceBars(app) {
  const p = app._priceToday();
  const h = app._now().getHours();
  return `<div class="bar-chart">${p.values.map((v, i) => `<i class="${i === h ? "now" : ""}" style="height:${Math.max(8, ((v - p.min) / (p.max - p.min || 1)) * 100)}%;background:${priceColor(v, p.min, p.max)}" title="kl. ${i} · ${fmtPrice(v)} kr"></i>`).join("")}</div>
  <div class="chart-cap"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`;
}

function navGrid() {
  const groups = [
    { title: "Hjemmet", routes: NAV_ITEMS.slice(0, 9) },
    { title: "Drift", routes: NAV_ITEMS.slice(9) },
  ];
  return groups
    .map(
      (g) => `<div class="block"><div class="block-label">${g.title}</div><div class="mini-grid">${g.routes
        .map(
          (n) =>
            `<button class="mini-stat" data-nav="${n.route}" style="text-align:left;min-height:82px"><div class="k">${icon(n.icon)}</div><div class="v" style="font-size:17px;margin-top:8px">${esc(n.title)}</div><div class="row-sub">${esc(n.hint)}</div></button>`
        )
        .join("")}</div></div>`
    )
    .join("");
}

function roomSheet(app, room) {
  const t = app._tempFor(room);
  const air = app._airFor(room);
  const open = app._openingStats(room);
  const lights = app._lightStats(room);
  const sum = `${t.v === null ? "–" : fmtNum(t.v, 1)}° · ${air.label} ${air.value}${lights ? ` · ${lights.on}/${lights.total} lys` : ""}${open ? ` · ${open.open ? open.open + " åben" : "lukket"}` : ""}`;
  const c = room.climate ? app._get(room.climate) : null;
  const cur = c?.attributes?.current_temperature;
  const target = c?.attributes?.temperature;
  const mode = c?.state;
  const opening = room.openings?.length ? room.openings : [];
  const lightIds = [...new Set(room.lights || [])];
  const groups = lightIds.filter((id) => ["light.kokken", "light.bryggers", "light.entre", "light.lille_gang"].includes(id));
  const members = lightIds.filter((id) => !groups.includes(id));
  const media = room.media ? app._get(room.media) : null;

  return `${app._sheetHeader("RUM", room.name, sum)}<div class="sheet-scroll">
    <div class="readings">
      ${read("Temperatur", `rm_${room.id}_temp`, t.v === null ? "–" : fmtNum(t.v, 1), "°C")}
      ${read("Luftfugtighed", `rm_${room.id}_hum`, room.humidity && !app._unavail(room.humidity) ? Math.round(app._n(room.humidity)) : "–", "%")}
      ${read("CO₂", `rm_${room.id}_co2`, room.co2 && !app._unavail(room.co2) ? Math.round(app._n(room.co2)) : "–", "ppm")}
      ${read("PM2,5", `rm_${room.id}_pm`, room.pm25 && !app._unavail(room.pm25) ? fmtNum(app._n(room.pm25), 1) : "–", "µg/m³")}
    </div>
    ${t.fallback ? `<div class="block-note">Temperatursensoren i rummet svarer ikke lige nu — værdien kommer fra gulvvarmen.</div>` : ""}

    <div class="block">
      <div class="block-head"><div class="block-label">Temperatur · 24 timer</div><div class="block-label"><b>${t.v === null ? "–" : fmtNum(t.v, 1)}°</b></div></div>
      ${chart({ key: `roomTemp:${room.id}`, color: "var(--sky)" }, 120)}
    </div>

    ${room.humidity ? `<div class="block"><div class="block-head"><div class="block-label">Luftfugtighed · 24 timer</div><div class="block-label"><b>${app._unavail(room.humidity) ? "–" : Math.round(app._n(room.humidity)) + " %"}</b></div></div>${chart({ key: room.humidity, color: "var(--sky)" }, 100)}</div>` : ""}
    ${room.co2 ? `<div class="block"><div class="block-head"><div class="block-label">CO₂ · 24 timer</div><div class="block-label"><b>${app._unavail(room.co2) ? "–" : Math.round(app._n(room.co2)) + " ppm"}</b></div></div>${chart({ key: room.co2, color: "var(--sage)" }, 100)}</div>` : ""}
    ${room.pm25 ? `<div class="block"><div class="block-head"><div class="block-label">PM2,5 · 24 timer</div><div class="block-label"><b>${app._unavail(room.pm25) ? "–" : fmtNum(app._n(room.pm25), 1)}</b></div></div>${chart({ key: room.pm25, color: "var(--brass)" }, 90)}</div>` : ""}

    ${lightIds.length ? `<div class="block">
      <div class="block-head"><div class="block-label">Lys</div><div class="block-label"><b>${lights ? lights.on + " af " + lights.total : ""}</b></div></div>
      <div class="list">
        ${groups.map((id) => lightRow(app, id, app._get(id)?.attributes?.friendly_name || id, true)).join("")}
        ${members.length ? `<details class="light-details"><summary>${members.length} enkeltlys</summary>${members.map((id) => lightRow(app, id, app._get(id)?.attributes?.friendly_name || id, false)).join("")}</details>` : ""}
      </div>
    </div>` : ""}

    ${opening.length ? `<div class="block">
      <div class="block-head"><div class="block-label">Åbninger</div><div class="block-label"><b>${open?.open ? open.open + " åben" : "alt lukket"}</b></div></div>
      <div class="list">${opening.map((o) => {
        const on = app._on(o.id);
        return row(esc(o.name), `${o.kind} · ${on ? "åben" : "lukket"} ${lastChanged(app, o.id)}`, `<span class="status-line"><i class="dot ${on ? "warn" : ""}"></i>${on ? "ÅBEN" : "LUKKET"}</span>`, { lead: icon(o.kind === "Lækage" ? "drop" : o.kind === "Vindue" ? "wind" : "door") });
      }).join("")}</div>
    </div>` : ""}

    ${room.climate ? `<div class="block">
      <div class="block-head"><div class="block-label">Gulvvarme</div><div class="block-label"><b>${mode === "off" ? "slukket" : "tændt"}</b></div></div>
      <div class="row">
        <span class="row-main"><div class="row-name">${esc(room.name)}</div><div class="row-sub">${cur !== undefined ? fmtNum(cur, 1) + "° nu" : "–"} · ${c?.attributes?.hvac_action === "heating" ? "varmer" : "holder"}</div></span>
        ${stepper(room.climate, "temp-step", 0.5, `rm_${room.id}_target`)}
        ${toggle(room.climate, "hvac-toggle", false)}
      </div>
      <div class="block-note">Setpunkt nu: <b>${target !== undefined ? fmtNum(target, 1) + "°" : "–"}</b>. Gulvvarmen følger automatikken, når vinduer og døre er åbne.</div>
    </div>` : ""}

    ${room.fan ? `<div class="block">
      <div class="block-head"><div class="block-label">Emhætte</div><div class="block-label"><b>${app._on(room.fan) ? "tændt" : "slukket"}</b></div></div>
      ${row("Thermex", `Filtertid ${fmtNum(app._n(room.filter), 1)} t`, `<span class="row-val">${app._get(room.fan)?.attributes?.preset_mode || "–"}</span>`, { lead: icon("fan") })}
      <div class="btn-row"><button class="btn small" data-act="toggle-switch" data-entity="${room.fan}">Skift til/fra</button><button class="btn small" data-act="press-button" data-entity="button.192_168_110_242_nulstil_filtertid">Nulstil filtertid</button></div>
    </div>` : ""}

    ${room.motion ? `<div class="block"><div class="block-head"><div class="block-label">Bevægelse & lys</div></div><div class="readings">${read("Bevægelse", "rm_entre_motion", app._on(room.motion) ? "Aktiv" : "Rolig", "")}${read("Belysning", "rm_entre_lux", Math.round(app._n(room.illuminance) ?? 0), "lx")}</div></div>` : ""}

    ${room.battery ? `<div class="block"><div class="block-head"><div class="block-label">Batteri</div></div>${row("Bilresa knap", "Soveværelse", `<span class="row-val">${Math.round(app._n(room.battery) ?? 0)}<small>%</small></span>`, { lead: icon("battery") })}</div>` : ""}

    ${media ? `<div class="block"><div class="block-head"><div class="block-label">Medie</div><div class="block-label"><b>${media.state === "playing" ? "spiller" : media.state === "off" ? "slukket" : media.state}</b></div></div>
      ${row(esc(media.attributes.friendly_name || "Soundbar"), "LG · stue", `<button class="icon-btn" data-act="media-toggle" data-entity="${room.media}" aria-label="Afspil">${icon(media.state === "playing" ? "pause" : "play")}</button>`, { lead: icon("play") })}
    </div>` : ""}

    <div class="note">Alle værdier opdateres live. Manglende sensorer vises som <b>–</b>, så rummet stadig kan læses.</div>
  </div>`;
}

function ventSheet(app) {
  const t = app._n("sensor.nilan602_actual_room_temperature");
  const hum = app._n("sensor.nilan602_humidity");
  const step = app._n("sensor.nilan602_actual_fan_step");
  const filter = app._state("sensor.nilan602_air_filter_alarm_status");
  const target = app._attr("climate.nilan602_nilan", "temperature");
  const fan = app._attr("climate.nilan602_nilan", "fan_mode", "2");
  const mode = app._state("climate.nilan602_nilan");
  const out = app._n("sensor.nilan602_outdoor_temperature");
  const inlet = app._n("sensor.nilan602_inlet_after_heater_temperature");
  const exhaust = app._n("sensor.nilan602_exhaust_temperature");
  const outlet = app._n("sensor.nilan602_outlet_temperature");
  const eff = app._n("sensor.nilan602_heat_exchange_efficiency");
  const days = app._n("sensor.nilan602_days_to_next_filter_change_alarm");
  return `${app._sheetHeader("SYSTEM", "Ventilation", `${fmtNum(t, 1)}° · trin ${step ?? "–"} · ${filter === "OK" ? "filter OK" : filter || "–"}`)}<div class="sheet-scroll">
    <div class="readings">
      ${read("Rumtemperatur", "ve_t", fmtNum(t, 1), "°C")}
      ${read("Luftfugtighed", "ve_h", hum !== null ? Math.round(hum) : "–", "%")}
      ${read("Blæsertrin", "ve_step", step !== null ? String(Math.round(step)) : "–", "/ 4")}
      ${read("Effektivitet", "ve_eff", eff !== null ? Math.round(eff) : "–", "%")}
    </div>

    <div class="block">
      <div class="block-label">Luftens vej gennem huset</div>
      <div class="flow-wrap air-flow">
        <svg viewBox="0 0 560 118" aria-hidden="true">
          <defs><marker id="airar" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="var(--line-strong)"/></marker></defs>
          <path d="M80 52 H138" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
          <path d="M194 52 H252" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
          <path d="M308 52 H366" stroke="var(--coral)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
          <path d="M422 52 H480" stroke="var(--coral)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
          <circle cx="56" cy="52" r="24" fill="none" stroke="var(--sky)" stroke-width="1"/>
          <circle cx="166" cy="52" r="24" fill="none" stroke="var(--sky)" stroke-width="1"/>
          <circle cx="280" cy="52" r="26" fill="none" stroke="var(--accent)" stroke-width="1"/>
          <circle cx="394" cy="52" r="24" fill="none" stroke="var(--coral)" stroke-width="1"/>
          <circle cx="504" cy="52" r="24" fill="none" stroke="var(--coral)" stroke-width="1"/>
          <text x="56" y="18" class="flow-label" text-anchor="middle">UDE</text>
          <text x="56" y="57" class="flow-val" text-anchor="middle" data-bind="ve_out">–</text>
          <text x="166" y="18" class="flow-label" text-anchor="middle">IND</text>
          <text x="166" y="57" class="flow-val" text-anchor="middle" data-bind="ve_in">–</text>
          <text x="280" y="18" class="flow-label" text-anchor="middle">RUM</text>
          <text x="280" y="58" class="flow-val" text-anchor="middle" data-bind="ve_room">–</text>
          <text x="394" y="18" class="flow-label" text-anchor="middle">AFKAST</text>
          <text x="394" y="57" class="flow-val" text-anchor="middle" data-bind="ve_exhaust">–</text>
          <text x="504" y="18" class="flow-label" text-anchor="middle">UD</text>
          <text x="504" y="57" class="flow-val" text-anchor="middle" data-bind="ve_outlet">–</text>
          <text x="280" y="102" class="flow-label" text-anchor="middle">NILAN · LUFTVEJ</text>
        </svg>
      </div>
    <div class="block">
      <div class="block-head"><div class="block-label">Styring</div><div class="block-label"><b>${mode === "heat" ? "varme" : mode === "cool" ? "køl" : "auto"}</b></div></div>
      <div class="row"><span class="row-main"><div class="row-name">Setpunkt</div><div class="row-sub">Nilan · automatisk drift</div></span>${stepper("climate.nilan602_nilan", "temp-step", 1, "ve_target")}</div>
      <div class="row"><span class="row-main"><div class="row-name">Drift</div></span><div class="seg">
        <button class="${mode === "heat_cool" ? "active" : ""}" data-act="hvac" data-entity="climate.nilan602_nilan" data-mode="heat_cool">Auto</button>
        <button class="${mode === "cool" ? "active" : ""}" data-act="hvac" data-entity="climate.nilan602_nilan" data-mode="cool">Køl</button>
        <button class="${mode === "heat" ? "active" : ""}" data-act="hvac" data-entity="climate.nilan602_nilan" data-mode="heat">Varme</button>
      </div></div>
      <div class="row"><span class="row-main"><div class="row-name">Blæsertrin</div><div class="row-sub">Manuel hastighed</div></span><div class="seg">
        ${[0, 1, 2, 3, 4].map((i) => `<button class="${String(fan) === String(i) ? "active" : ""}" data-act="fan" data-entity="climate.nilan602_nilan" data-mode="${i}">${i}</button>`).join("")}
      </div></div>
    </div>

    <div class="block">
      <div class="block-head"><div class="block-label">Filter</div><div class="block-label"><b>${filter || "–"}</b></div></div>
      <div class="readings">
        ${read("Dage siden skift", "ve_days_since", Math.round(app._n("sensor.nilan602_days_since_last_filter_change_alarm") ?? 0), "")}
        ${read("Dage til næste", "ve_days", Math.round(days ?? 0), "")}
        ${read("Indtagshastighed", "ve_ifan", Math.round(app._n("sensor.nilan602_inlet_fan_speed") ?? 0), "%")}
        ${read("Afkastshastighed", "ve_efan", Math.round(app._n("sensor.nilan602_exhaust_fan_speed") ?? 0), "%")}
      </div>
      <div class="btn-row"><button class="btn small" data-act="press-button" data-entity="button.nilan602_reset_alarm">Nulstil alarm</button><span class="status-line" style="margin-left:auto"><i class="dot ${filter === "OK" ? "" : "warn"}"></i>${filter === "OK" ? "Filter OK" : filter || "–"}</span></div>
    </div>

    <div class="block">
      <div class="block-label">Brugervalg</div>
      <div class="row"><span class="row-main"><div class="row-name">Funktion 1</div></span><select class="select" data-select-entity="select.nilan602_set_user_function">${(app._attr("select.nilan602_set_user_function", "options") || []).map((o) => `<option ${app._state("select.nilan602_set_user_function") === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
      <div class="row"><span class="row-main"><div class="row-name">Tid</div></span><span class="row-val">${Math.round(app._n("number.nilan602_user_time_set_minutes") ?? 0)}<small>min</small></span></div>
      <div class="row"><span class="row-main"><div class="row-name">Hastighed</div></span><span class="row-val">${Math.round(app._n("number.nilan602_user_ventilation_speed_set") ?? 0)}<small>/4</small></span></div>
      <div class="row"><span class="row-main"><div class="row-name">Funktion 2</div></span><select class="select" data-select-entity="select.nilan602_set_user_function_2">${(app._attr("select.nilan602_set_user_function_2", "options") || []).map((o) => `<option ${app._state("select.nilan602_set_user_function_2") === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
    </div>

    <div class="block"><div class="block-label">Anlæg</div>
      ${row("Type", "", `<span class="row-val" style="font-size:12px">${esc(app._state("sensor.nilan602_aggregate_type") || "–")}</span>`, { lead: icon("info") })}
      ${row("Drift", "", `<span class="row-val" style="font-size:12px">${esc(app._state("sensor.nilan602_operation_mode") || "–")}</span>`, { lead: icon("fan") })}
      ${row("Software", "", `<span class="row-val" style="font-size:12px">${esc(app._state("sensor.nilan602_software_version") || "–")}</span>`, { lead: icon("info") })}
    </div>
  </div>`;
}

function lightsSheet(app) {
  const groups = LIGHTS;
  const extra = "light.192_168_110_242_enhaettelys";
  const on = app._n("sensor.count_all_lights", 0);
  return `${app._sheetHeader("LYS", "Lys", `${on} af 21 lys tændt`)}<div class="sheet-scroll">
    <div class="block">
      <div class="btn-row"><button class="btn danger" data-act="sluk-alt">${icon("light")} Sluk alt lys</button><span class="status-line" style="margin-left:auto"><i class="dot ${on ? "warn" : ""}"></i>${on ? on + " tændt" : "alt slukket"}</span></div>
      <div data-confirm></div>
    </div>
    ${groups.map((g) => `<div class="block">
      <div class="block-head"><div class="block-label">${esc(g.name)}</div><div class="block-label"><b>${g.members.length + (g.extra?.length || 0)} lys</b></div></div>
      ${lightRow(app, g.entity, g.name, true)}
      <details class="light-details"><summary>${g.members.length} enkeltspots</summary>${g.members.map((id, i) => lightRow(app, id, `${i + 1}`, false)).join("")}</details>
      ${(g.extra || []).map((id) => lightRow(app, id, "Emhættelys", true)).join("")}
    </div>`).join("")}
    <div class="note">Grupperne tænder og slukker hele rummet. Sliderne styrer lysstyrken. “Sluk alt” rammer alle lys i huset.</div>
  </div>`;
}

function heatSheet(app) {
  const openCount = HEATING.filter((h) => h.opening && app._on(h.opening)).length;
  return `${app._sheetHeader("VARME", "Gulvvarme", `${HEATING.length} zoner · ${openCount} med åbne vinduer`)}<div class="sheet-scroll">
    <div class="block">
      <div class="block-label">Zoner</div>
      <div class="list">${HEATING.map((h, i) => {
        const c = app._get(h.entity);
        const on = c?.state !== "off";
        const opening = h.opening && app._on(h.opening);
        return `<div class="row">
          <span class="row-main"><div class="row-name">${esc(h.name)} ${opening ? `<i class="status-line" style="display:inline-flex;margin-left:6px"><i class="dot warn"></i></i>` : ""}</div><div class="row-sub">${fmtNum(c?.attributes?.current_temperature, 1)}° nu · ${c?.attributes?.hvac_action === "heating" ? "varmer" : "holder"}${opening ? " · vindue åbent" : ""}</div></span>
          ${stepper(h.entity, "temp-step", 0.5, `ht_${i}_target`)}
          <button class="toggle ${on ? "on" : ""}" data-act="hvac-toggle" data-entity="${h.entity}" data-not-off="${h.entity}" aria-label="Til/fra"></button>
        </div>`;
      }).join("")}</div>
    </div>
    <div class="block">
      <div class="block-label">Reservekanaler</div>
      <div class="list">${HEATING_RESERVE.map((h, i) => {
        const c = app._get(h.entity);
        return `<div class="row"><span class="row-main"><div class="row-name">${esc(h.name)}</div><div class="row-sub">${fmtNum(c?.attributes?.current_temperature, 1)}° nu</div></span>${stepper(h.entity, "temp-step", 0.5, `hr_${i}_target`)}</div>`;
      }).join("")}</div>
    </div>
    <div class="block">
      <div class="block-label">Temperaturgrænser</div>
      <div class="row"><span class="row-main"><div class="row-name">Standardtemperatur</div><div class="row-sub">Bruges af automatikken</div></span>${stepper("input_number.gulvvarme_standardtemperatur", "input-step", 0.5, "ht_std")}</div>
      <div class="row"><span class="row-main"><div class="row-name">Sænket temperatur</div><div class="row-sub">Ved åbne vinduer og døre</div></span>${stepper("input_number.gulvvarme_saenket_temperatur", "input-step", 0.5, "ht_low")}</div>
    </div>
    <div class="note">Gulvvarmen er delt i <b>8 zoner</b> plus tre reservekanaler. Når et vindue eller en dør åbnes, sænker automatikken setpunktet til den sænkede temperatur.</div>
  </div>`;
}

function energySheet(app) {
  const p = app._priceToday();
  const buy = app._n("sensor.electricity_total_price");
  const sell = app._n("sensor.electricity_sell_price");
  const spot = app._n("sensor.nord_pool_dk2_current_price");
  const cheap = app._cheapest(3);
  const tesla = app._n("sensor.tesla_wall_connector_total_power");
  const plugged = app._on("binary_sensor.tesla_wall_connector_koretoj_tilsluttet");
  const low = app._n("sensor.nord_pool_dk2_lowest_price");
  const high = app._n("sensor.nord_pool_dk2_highest_price");
  const next = app._n("sensor.nord_pool_dk2_next_price");
  const prev = app._n("sensor.nord_pool_dk2_previous_price");
  const tomorrow = app._on("binary_sensor.nord_pool_dk2_tomorrow_price_available");
  return `${app._sheetHeader("ENERGI", "Energi", `${fmtPrice(buy)} kr/kWh nu · billigst ${String(cheap.start).padStart(2, "0")}–${String(cheap.end).padStart(2, "0")}`)}<div class="sheet-scroll">
    <div class="block">
      <div class="big-read">${fmtPrice(buy)}<small>kr/kWh</small></div>
      <div class="block-note">Købspris lige nu · salgspris ${fmtPrice(sell)} kr · spot ${fmtPrice(spot)} kr</div>
      <div class="block" style="margin-top:18px"><div class="block-label">Døgnets priser</div>${priceBars(app)}</div>
      <div class="mini-grid" style="margin-top:12px">
        <div class="mini-stat"><div class="k">Billigste 3 timer</div><div class="v">${fmtPrice(cheap.avg)}<small>kr</small></div><div class="row-sub">kl. ${String(cheap.start).padStart(2, "0")}–${String(cheap.end).padStart(2, "0")}</div></div>
        <div class="mini-stat"><div class="k">I morgen</div><div class="v" style="font-size:18px">${tomorrow ? "Offentliggjort" : "Ikke endnu"}</div><div class="row-sub">${tomorrow ? "Se priser i morgen" : "Kommer typisk kl. 13"}</div></div>
      </div>
    </div>
    <div class="block">
      <div class="block-label">Priser lige nu</div>
      <div class="readings">${read("Køb", "en_buy", fmtPrice(buy), "kr")}${read("Salg", "en_sell", fmtPrice(sell), "kr")}${read("Spot", "en_spot", fmtPrice(spot), "kr")}${read("Næste time", "en_next", next !== null ? fmtPrice(next) : "–", "kr")}</div>
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">Dagens priser</div></div>
      <div class="list">
        ${row("Laveste", "i dag", `<span class="row-val">${low !== null ? fmtPrice(low) : "–"}<small>kr</small></span>`, { lead: icon("drop") })}
        ${row("Højeste", "i dag", `<span class="row-val">${high !== null ? fmtPrice(high) : "–"}<small>kr</small></span>`, { lead: icon("flame") })}
        ${row("Forrige time", "", `<span class="row-val">${prev !== null ? fmtPrice(prev) : "–"}<small>kr</small></span>`, { lead: icon("clock") })}
      </div>
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">Tesla</div><div class="block-label"><b>${plugged ? "tilsluttet" : "ikke tilsluttet"}</b></div></div>
      <div class="readings">${read("Effekt", "en_tesla", tesla !== null ? fmtNum(tesla, 1) : "–", "kW")}${read("Session", "en_tesla_session", fmtNum(app._n("sensor.tesla_wall_connector_energi_til_sessionen"), 1), "kWh")}${read("Total", "en_tesla_total", fmtNum(app._n("sensor.tesla_wall_connector_energi"), 0), "kWh")}${read("Standby", "en_standby", fmtNum(app._n("sensor.all_standby_power"), 1), "W")}</div>
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">Apparater</div><div class="block-label"><b>${fmtNum(app._n("sensor.all_standby_energy"), 1)} kWh standby</b></div></div>
      <div class="list">
        ${applianceRow(app, "Fryser", "sensor.grillplats_plug_effekt", "sensor.grillplats_plug_energi", "switch.grillplats_plug", "GRILLPLATS")}
        ${applianceRow(app, "Server", "sensor.grillplats_plug_effekt_2", "sensor.grillplats_plug_energi_2", "switch.grillplats_plug_2", "GRILLPLATS")}
        ${applianceRow(app, "PC", "sensor.kontor_grillplats_pc_elektrisk_effekt", "sensor.kontor_grillplats_pc_energi", "switch.kontor_grillplats_pc", "Kontor")}
      </div>
    </div>
    <div class="btn-row"><button class="btn small" data-nav="sol">Solceller</button><button class="btn small" data-nav="vand">Vand</button><button class="btn small" data-nav="teknik">Teknik</button></div>
  </div>`;
}

function applianceRow(app, name, power, energy, sw, sub) {
  const p = app._n(power);
  const e = app._n(energy);
  const on = app._on(sw);
  return `<div class="row"><span class="row-main"><div class="row-name">${esc(name)}</div><div class="row-sub">${esc(sub)} · ${on ? "tændt" : "slukket"}</div></span><span class="row-val">${p !== null ? fmtNum(p, 0) : "–"}<small>W</small></span><button class="toggle ${on ? "on" : ""}" data-act="toggle-switch" data-entity="${sw}" data-on="${sw}" aria-label="Til/fra"></button></div>`;
}

function solarSheet(app, sub) {
  const tabs = [
    { key: "overblik", label: "Overblik", route: "sol" },
    { key: "produktion", label: "Produktion", route: "sol/produktion" },
    { key: "batteri", label: "Batteri", route: "sol/batteri" },
    { key: "prognose", label: "Prognose", route: "sol/prognose" },
    { key: "afkast", label: "Afkast", route: "sol/afkast" },
  ];
  const soc = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
  const day = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
  const now = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0);
  const sum = `${fmtNum(soc, 0)} % batteri · ${fmtNum(day, 1)} kWh i dag · ${fmtNum(now, 0)} W nu`;
  return `${app._sheetHeader("SOL", "Solceller", sum)}${app._sheetTabs(tabs, sub)}<div class="sheet-scroll">${solarBody(app, sub)}</div>`;
}

function solarBody(app, sub) {
  if (sub === "produktion") return solarProduction(app);
  if (sub === "batteri") return solarBattery(app);
  if (sub === "prognose") return solarForecast(app);
  if (sub === "afkast") return solarPayback(app);
  return solarOverview(app);
}

function solarOverview(app) {
  const soc = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
  const day = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
  const pv = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0);
  const load = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower", 0);
  const grid = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_out_total_power", 0);
  const batt = app._n("sensor.pulse_batteri_effekt", 0);
  const l1 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l1");
  const l2 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l2");
  const l3 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l3");
  const pv3 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power", 0);
  const pv4 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power", 0);
  const u3 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_voltage", 0);
  const u4 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_voltage", 0);
  const i3 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_current", 0);
  const i4 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_current", 0);
  return `<div class="readings">
    ${read("Batteri", "so_soc", fmtNum(soc, 0), "%")}
    ${read("I dag", "so_day", fmtNum(day, 1), "kWh")}
    ${read("Lige nu", "so_now", fmtNum(pv, 0), "W")}
    ${read("Huset bruger", "so_load", fmtNum(load, 0), "W")}
  </div>
  <div class="block">
    <div class="block-label">Energi-flow</div>
    <div class="flow-wrap solar-flow">
      <svg viewBox="0 0 560 132" aria-hidden="true">
        <defs><marker id="ar" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="var(--line-strong)"/></marker></defs>
        <path d="M102 66 H168" stroke="var(--amber)" stroke-width="1.2" marker-end="url(#ar)" stroke-dasharray="4 5"/>
        <path d="M252 66 H310" stroke="var(--line-strong)" stroke-width="1.2" marker-end="url(#ar)" stroke-dasharray="4 5"/>
        <path d="M390 66 H452" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#ar)" stroke-dasharray="4 5"/>
        <circle cx="70" cy="66" r="30" fill="none" stroke="var(--amber)" stroke-width="1"/>
        <circle cx="210" cy="66" r="40" fill="none" stroke="var(--line-strong)" stroke-width="1"/>
        <circle cx="350" cy="66" r="30" fill="none" stroke="var(--sky)" stroke-width="1"/>
        <circle cx="490" cy="66" r="30" fill="none" stroke="var(--sage)" stroke-width="1"/>
        <text x="70" y="28" class="flow-label" text-anchor="middle">SOL</text>
        <text x="70" y="64" class="flow-val" text-anchor="middle" data-bind="fl_pv">0</text>
        <text x="70" y="78" class="flow-unit" text-anchor="middle">WATT</text>
        <text x="210" y="20" class="flow-label" text-anchor="middle">BATTERI</text>
        <text x="210" y="66" class="flow-val" text-anchor="middle" data-bind="fl_soc">27</text>
        <text x="210" y="80" class="flow-unit" text-anchor="middle">PROCENT</text>
        <text x="350" y="28" class="flow-label" text-anchor="middle">HUS</text>
        <text x="350" y="64" class="flow-val" text-anchor="middle" data-bind="fl_load">665</text>
        <text x="350" y="78" class="flow-unit" text-anchor="middle">WATT</text>
        <text x="490" y="28" class="flow-label" text-anchor="middle">NET</text>
        <text x="490" y="64" class="flow-val" text-anchor="middle" data-bind="fl_grid">665</text>
        <text x="490" y="78" class="flow-unit" text-anchor="middle" data-bind="fl_grid_unit">WATT</text>
      </svg>
    </div>
  </div>
  <div class="block"><div class="block-head"><div class="block-label">Effekt · 24 timer</div><div class="legend"><span><i style="--c:var(--amber)"></i>Sol</span><span><i style="--c:var(--sky)"></i>Hus</span><span><i style="--c:var(--sage)"></i>Batteri</span><span><i style="--c:var(--muted)"></i>Net</span></div></div>
    ${chart([
      { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", color: "var(--amber)" },
      { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower", color: "var(--sky)" },
      { key: "24:sensor.pulse_batteri_effekt", color: "var(--sage)" },
      { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_grid_out_total_power", color: "var(--muted)" },
    ], 150)}
  </div>
  <div class="block"><div class="block-label">Elnet · faser</div><div class="readings">${read("L1", "so_l1", fmtNum(l1, 1), "A")}${read("L2", "so_l2", fmtNum(l2, 1), "A")}${read("L3", "so_l3", fmtNum(l3, 1), "A")}${read(grid < 0 ? "Net · køb" : "Net · salg", "so_grid", fmtNum(Math.abs(grid), 0), "W")}</div>
    ${chart([{ key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l1", color: "var(--sky)" }, { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l2", color: "var(--brass)" }, { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l3", color: "var(--plum)" }], 110)}
  </div>
  <div class="block"><div class="block-label">Solceller · MPPT</div><div class="readings">${read("MPPT 3", "so_pv3", fmtNum(pv3, 0), "W")}${read("MPPT 4", "so_pv4", fmtNum(pv4, 0), "W")}${read("Spænding 3", "so_u3", fmtNum(u3, 1), "V")}${read("Spænding 4", "so_u4", fmtNum(u4, 1), "V")}</div><div class="block-note">Strøm: ${fmtNum(i3, 1)} A / ${fmtNum(i4, 1)} A. Kun MPPT 3 og 4 er tilsluttet i anlægget.</div></div>
  <div class="btn-row"><button class="btn" data-act="helios">${icon("solar")} Åbn Helios 3D</button><button class="btn small" data-nav="sol/produktion">Produktion</button><button class="btn small" data-nav="sol/batteri">Batteri</button><button class="btn small" data-nav="sol/prognose">Prognose</button><button class="btn small" data-nav="sol/afkast">Afkast</button></div>`;
}

function solarProduction(app) {
  const forecast = app._n("sensor.hjem_energy_production_today", 0);
  const actual = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
  const month = app._n("sensor.sol_denne_maned", 0);
  const year = app._n("sensor.sol_i_ar", 0);
  const net = app._n("sensor.net_i_dag", 0);
  const pv3 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power", 0);
  const pv4 = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power", 0);
  const totalProd = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_total_production", 0);
  const u3 = pv3 !== null ? (pv3 / 5700) * 100 : null;
  const u4 = pv4 !== null ? (pv4 / 3325) * 100 : null;
  return `<div class="readings">${read("Prognose i dag", "sp_forecast", fmtNum(forecast, 1), "kWh")}${read("Faktisk i dag", "sp_actual", fmtNum(actual, 1), "kWh")}${read("Denne måned", "sp_month", fmtNum(month, 1), "kWh")}${read("I år", "sp_year", fmtNum(year, 1), "kWh")}</div>
  <div class="block"><div class="block-head"><div class="block-label">Produktion mod prognose</div></div>${chart([{ key: "solarForecast", color: "var(--amber)" }, { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", color: "var(--text)" }], 150)}<div class="legend"><span><i style="--c:var(--amber)"></i>Prognose</span><span><i style="--c:var(--text)"></i>Faktisk</span></div></div>
  <div class="block"><div class="block-label">Strings</div><div class="readings">${read("MPPT 3", "sp_pv3", fmtNum(pv3, 0), "W")}${read("MPPT 4", "sp_pv4", fmtNum(pv4, 0), "W")}${read("Net i dag", "sp_net", fmtNum(net, 1), "kWh")}${read("Udbytte", "sp_yield", fmtNum(month / 9.025, 1), "kWh/kWp")}</div><div class="block-note">Udnyttelse af navneplade lige nu: <b>PV3 ${u3 !== null ? fmtNum(u3, 0) : "–"} %</b> · <b>PV4 ${u4 !== null ? fmtNum(u4, 0) : "–"} %</b>.</div></div>
  <div class="block"><div class="block-label">Strings · 24 timer</div>${chart([{ key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power", color: "var(--brass)" }, { key: "24:sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power", color: "var(--sky)" }], 110)}<div class="legend"><span><i style="--c:var(--brass)"></i>MPPT 3</span><span><i style="--c:var(--sky)"></i>MPPT 4</span></div></div>
  <div class="block"><div class="block-label">Total</div><div class="readings">${read("Total produceret", "sp_total", fmtNum(totalProd, 0), "kWh")}${read("PV3 udnyttelse", "sp_u3", u3 !== null ? fmtNum(u3, 0) : "–", "%")}${read("PV4 udnyttelse", "sp_u4", u4 !== null ? fmtNum(u4, 0) : "–", "%")}${read("Net i dag", "sp_net2", fmtNum(net, 1), "kWh")}</div></div>
  <div class="block"><div class="block-label">Energi pr. dag · 7 dage</div><div class="day-bars" data-bars="solarWeek"><span class="day-empty">Indlæser…</span></div><div class="block-note">Anlægget er 5,700 kWp + 3,325 kWp = <b>9,025 kWp</b>. Månedens udbytte er ${fmtNum(month / 9.025, 1)} kWh/kWp.</div></div>`;
}

function solarBattery(app) {
  const soc = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
  const temp = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_temperature", 0);
  const volt = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_voltage", 0);
  const amp = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_output_a", 0);
  const inv = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_temperature", 0);
  const min = app._n("number.sunmate_io_pulse_ee40a0_pulse_battery_min_soc", 10);
  const max = app._n("number.sunmate_io_pulse_ee40a0_pulse_battery_max_soc", 95);
  const lad = app._n("sensor.pulse_batteri_ladning");
  const afl = app._n("sensor.pulse_batteri_afladning");
  return `<div class="block"><div class="big-read">${fmtNum(soc, 0)}<small>% batteri</small></div><div class="block-note">Ladning lige nu. Batteriet kan styres mellem min. og maks. SoC.</div></div>
  <div class="readings">${read("Temperatur", "sb_temp", fmtNum(temp, 1), "°C")}${read("Spænding", "sb_volt", fmtNum(volt, 1), "V")}${read("Strøm", "sb_amp", fmtNum(amp, 1), "A")}${read("Inverter", "sb_inv", fmtNum(inv, 1), "°C")}</div>
  <div class="readings" style="margin-top:10px">${read("Lader", "sb_lad", lad !== null ? fmtNum(lad, 0) : "–", "W")}${read("Aflader", "sb_afl", afl !== null ? fmtNum(afl, 0) : "–", "W")}${read("Effekt", "sb_eff", fmtNum(app._n("sensor.pulse_batteri_effekt"), 0), "W")}${read("SoC", "sb_soc", fmtNum(soc, 0), "%")}</div>
  <div class="block"><div class="block-label">Ladning · 7 dage</div>${chart({ key: "sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", color: "var(--sage)" }, 120)}</div>
  <div class="block"><div class="block-label">Lad / aflad · 7 dage</div>${chart([{ key: "sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_charge", color: "var(--sky)" }, { key: "sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_discharge", color: "var(--brass)" }], 110)}<div class="legend"><span><i style="--c:var(--sky)"></i>Ladning</span><span><i style="--c:var(--brass)"></i>Afladning</span></div></div>
  <div class="block"><div class="block-label">Grænser</div><div class="row"><span class="row-main"><div class="row-name">Min. SoC</div></span>${stepper("number.sunmate_io_pulse_ee40a0_pulse_battery_min_soc", "number-step", 1, "sb_min")}</div><div class="row"><span class="row-main"><div class="row-name">Maks. SoC</div></span>${stepper("number.sunmate_io_pulse_ee40a0_pulse_battery_max_soc", "number-step", 1, "sb_max")}</div></div>
  <div class="note">Batteriets effekt er spænding × strøm. Minus betyder opladning, plus betyder afladning. Grænserne styrer, hvor langt batteriet må lade op og aflade.</div>`;
}

function solarForecast(app) {
  const today = app._n("sensor.hjem_energy_production_today", 0);
  const rem = app._n("sensor.hjem_energy_production_today_remaining", 0);
  const now = app._n("sensor.hjem_power_production_now", 0);
  const hour = app._n("sensor.hjem_energy_current_hour", 0);
  const next = app._n("sensor.hjem_energy_next_hour", 0);
  const t24 = app._n("sensor.hjem_power_production_next_24hours", 0);
  const tom = app._n("sensor.hjem_energy_production_tomorrow", 0);
  const d2 = app._n("sensor.hjem_energy_production_d2", 0);
  const d3 = app._n("sensor.hjem_energy_production_d3", 0);
  const actual = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
  const diff = today > 0 ? (actual / today) * 100 : null;
  return `<div class="readings">${read("I dag", "sf_today", fmtNum(today, 1), "kWh")}${read("Rest i dag", "sf_rem", fmtNum(rem, 1), "kWh")}${read("Nu", "sf_now", fmtNum(now, 0), "W")}${read("Næste time", "sf_next", fmtNum(next, 2), "kWh")}</div>
  <div class="mini-grid" style="margin-top:10px"><div class="mini-stat"><div class="k">Faktisk i dag</div><div class="v">${fmtNum(actual, 1)}<small>kWh</small></div><div class="row-sub">prognose ${fmtNum(today, 1)}</div></div><div class="mini-stat"><div class="k">Prognose vs faktisk</div><div class="v">${diff !== null ? fmtNum(diff, 0) : "–"}<small>%</small></div><div class="row-sub">af dagens prognose</div></div></div>
  <div class="block"><div class="block-label">Prognose · 48 timer</div>${chart({ key: "solar48", color: "var(--amber)" }, 150)}<div class="block-note">I dag: <b>${fmtNum(hour, 1)} kWh</b> denne time · <b>${fmtNum(t24, 0)} W</b> de næste 24 timer.</div></div>
  <div class="block"><div class="block-label">Kommende dage</div><div class="readings">${read("I morgen", "sf_tom", fmtNum(tom, 1), "kWh")}${read("Om 2 dage", "sf_d2", fmtNum(d2, 1), "kWh")}${read("Om 3 dage", "sf_d3", fmtNum(d3, 1), "kWh")}${read("I dag", "sf_today2", fmtNum(today, 1), "kWh")}</div><div class="block-note">Prognosen kommer fra Open-Meteo <b>best_match</b>. Anlægget er sat til 9,025 kWp med 24° hældning.</div></div>`;
}

function solarPayback(app) {
  const total = app._n("sensor.sparet_total", 0);
  const solar = app._n("sensor.sparet_solceller", 0);
  const batt = app._n("sensor.sparet_batteri", 0);
  const rate = app._n("sensor.besparelse_rate_total", 0);
  const invS = app._n("input_number.investering_solceller", 0);
  const invB = app._n("input_number.investering_batteri", 0);
  const pct = app._n("sensor.tilbagebetalt_total", 0);
  const today = sumDelta(app, "sensor.sparet_total", 1);
  const month = sumDelta(app, "sensor.sparet_total", 30);
  const year = sumDelta(app, "sensor.sparet_total", 365);
  const left = Math.max(0, invS + invB - total);
  const days = rate > 0 ? left / (rate * 24) : null;
  const date = days !== null ? new Date(Date.now() + days * 86400000) : null;
  return `<div class="block"><div class="big-read">${fmtNum(pct, 1)}<small>% tilbagebetalt</small></div><div class="block-note">Sparet i alt: <b>${fmtNum(total, 0)} kr</b> · ${fmtNum(rate, 2)} kr/time lige nu.</div></div>
  <div class="readings">${read("I dag", "sa_today", today === null ? "–" : fmtNum(today, 0), "kr")}${read("Denne måned", "sa_month", month === null ? "–" : fmtNum(month, 0), "kr")}${read("I år", "sa_year", year === null ? "–" : fmtNum(year, 0), "kr")}${read("Tilbage", "sa_left", fmtNum(left, 0), "kr")}</div>
  <div class="mini-grid" style="margin-top:10px">${["Solceller", "Batteri"].map((n, i) => `<div class="mini-stat"><div class="k">${n}</div><div class="v">${fmtNum(i ? batt : solar, 0)}<small>kr</small></div><div class="row-sub">sparet i alt</div></div>`).join("")}</div>
  <div class="block"><div class="block-label">Hvornår er det tilbagebetalt?</div><div class="big-read" style="font-size:40px">${date ? date.toLocaleDateString("da-DK", { month: "long", year: "numeric" }) : "–"}</div><div class="block-note">Ved nuværende besparelse på ${fmtNum(rate, 2)} kr/time. Investeringen er ${fmtNum(invS + invB, 0)} kr.</div></div>
  <div class="block"><div class="block-label">Besparelse · 30 dage</div>${chart({ key: "savings30", color: "var(--sage)" }, 110)}</div>
  <div class="block"><div class="block-label">Besparelse · 1 år</div>${chart({ key: "savings365", color: "var(--brass)" }, 110)}</div>
  <div class="block"><div class="block-label">Indstillinger</div>
    <div class="row"><span class="row-main"><div class="row-name">Investering solceller</div></span>${stepper("input_number.investering_solceller", "input-step", 1000, "sa_inv_s")}</div>
    <div class="row"><span class="row-main"><div class="row-name">Investering batteri</div></span>${stepper("input_number.investering_batteri", "input-step", 1000, "sa_inv_b")}</div>
    <div class="row"><span class="row-main"><div class="row-name">Installeret</div></span><span class="row-val" style="font-size:13px">${esc(app._state("input_datetime.anlaeg_installeret") || "–")}</span></div>
  </div>
  <div class="note">Besparelsen er, hvad strømmen ville have kostet uden anlægget, minus hvad den faktisk koster. Tallene opdateres, efterhånden som der spares.</div>`;
}

function sumDelta(app, id, days) {
  const h = app._hist.get(id);
  if (!h) return null;
  const cut = Date.now() - days * 86400000;
  const vals = h.rows
    .filter((r) => histTs(r) >= cut)
    .map((r) => Number(r.s ?? r.state))
    .filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  return vals[vals.length - 1] - vals[0];
}

function waterSheet(app) {
  const day = app._n("sensor.bwt_perla_day_output", 0);
  const month = app._n("sensor.bwt_perla_month_output", 0);
  const total = app._n("sensor.bwt_perla_total_output", 0);
  const cost = app._n("sensor.vandudgift_total", 0);
  const flow = app._n("sensor.bwt_perla_current_flow", 0);
  const salt = app._n("sensor.bwt_perla_regenerativ_level", 0);
  const days = app._n("sensor.bwt_perla_regenerativ_days", 0);
  const cap = app._n("sensor.bwt_perla_capacity_1", 0);
  const state = app._state("sensor.bwt_perla_state") || "–";
  const leak1 = app._on("binary_sensor.klippbok_water_leak_sensor_water_leak");
  const leak2 = app._on("binary_sensor.klippbok_water_leak_sensor_water_leak_2");
  return `${app._sheetHeader("VAND", "Vand", `${fmtNum(day, 1)} L i dag · BWT ${state} · salt ${Math.round(salt)} %`)}<div class="sheet-scroll">
    <div class="block"><div class="big-read">${fmtNum(day, 1)}<small>L i dag</small></div><div class="block-note">Vandbehandleren har leveret ${fmtNum(month, 0)} L denne måned og ${fmtNum(total / 1000, 1)} m³ i alt.</div></div>
    <div class="readings">${read("Denne måned", "wa_month", fmtNum(month, 0), "L")}${read("I alt", "wa_total", fmtNum(total / 1000, 1), "m³")}${read("Udgift", "wa_cost", fmtNum(cost, 0), "kr")}${read("Flow nu", "wa_flow", fmtNum(flow, 2), "m³/h")}</div>
    <div class="block"><div class="block-head"><div class="block-label">BWT Perla</div><div class="block-label"><b>${state}</b></div></div>
      <div class="readings">${read("Salt", "wa_salt", Math.round(salt), "%")}${read("Rækker til", "wa_days", Math.round(days), "dage")}${read("Kapacitet", "wa_cap", fmtNum(cap, 0), "L")}${read("Flow", "wa_flow2", fmtNum(flow, 2), "m³/h")}</div>
      <div class="row"><span class="row-main"><div class="row-name">Ferietilstand</div><div class="row-sub">Sænker vandbehandlingen</div></span><button class="toggle" data-act="toggle-bool" data-entity="input_boolean.bwt_holiday_mode" data-on="input_boolean.bwt_holiday_mode"></button></div>
    </div>
    <div class="block"><div class="block-head"><div class="block-label">Vandlækage</div><div class="block-label"><b>${leak1 || leak2 ? "ALARM" : "alt tørt"}</b></div></div>
      ${row("Køkken", leak1 ? "Vand registreret" : "Ingen vand", `<span class="status-line"><i class="dot ${leak1 ? "warn" : ""}"></i>${leak1 ? "ALARM" : "OK"}</span>`, { lead: icon("drop") })}
      ${row("Bryggers", leak2 ? "Vand registreret" : "Ingen vand", `<span class="status-line"><i class="dot ${leak2 ? "warn" : ""}"></i>${leak2 ? "ALARM" : "OK"}</span>`, { lead: icon("drop") })}
      ${row("Batteri", "KLIPPBOK køkken", `<span class="row-val">${Math.round(app._n("sensor.klippbok_water_leak_sensor_batteri") ?? 0)}<small>%</small></span>`, { lead: icon("battery") })}
    </div>
    <div class="block"><div class="block-label">Flow · 24 timer</div>${chart({ key: "waterFlow", color: "var(--sky)" }, 110)}</div>
    <div class="note">BWT Perla blødgør vandet. Saltniveauet bør holdes over 20 %. Ved ferie kan behandlingen sænkes.</div>
  </div>`;
}

function securitySheet(app) {
  const allOpen = ROOMS.flatMap((r) => (r.openings || []).map((o) => ({ ...o, room: r.name })));
  if (!allOpen.some((o) => o.id === "binary_sensor.klippbok_water_leak_sensor_water_leak")) {
    allOpen.push({ id: "binary_sensor.klippbok_water_leak_sensor_water_leak", name: "Køkken lækage", kind: "Lækage", room: "Køkken" });
  }
  const openings = allOpen.filter((o) => o.kind !== "Lækage" && app._on(o.id));
  const leak = allOpen.filter((o) => o.kind === "Lækage" && app._on(o.id));
  const batteries = [
    ["sensor.myggbett_door_window_sensor_batteri_7", "Stue dør"],
    ["sensor.myggbett_door_window_sensor_batteri_8", "Stue vindue"],
    ["sensor.myggbett_door_window_sensor_batteri_4", "Spisestue"],
    ["sensor.myggbett_door_window_sensor_batteri_6", "Soveværelse"],
    ["sensor.myggbett_door_window_sensor_batteri", "Kontor"],
    ["sensor.myggbett_door_window_sensor_batteri_2", "Lille bad"],
    ["sensor.myggbett_door_window_sensor_batteri_5", "Stor bad"],
    ["sensor.myggbett_door_window_sensor_batteri_3", "Køkken"],
    ["sensor.klippbok_water_leak_sensor_batteri", "KLIPPBOK køkken"],
    ["sensor.klippbok_water_leak_sensor_batteri_2", "KLIPPBOK bryggers"],
    ["sensor.myggspray_wrlss_mtn_sensor_batteri", "Entre"],
    ["sensor.bilresa_dual_button_batteri", "Bilresa"],
  ].map(([id, n]) => ({ id, n, v: app._n(id, 0) })).sort((a, b) => a.v - b.v);
  return `${app._sheetHeader("SIKKERHED", "Sikkerhed", `${openings.length ? openings.length + " åbne" : "alt lukket"} · ${leak.length ? "vandlækage!" : "ingen lækage"}`)}<div class="sheet-scroll">
    <div class="block"><div class="block-label">Huset lige nu</div>
      <div class="house-wrap">
        <svg viewBox="0 0 560 220" class="house-svg" aria-hidden="true">
          <rect x="10" y="10" width="125" height="95" rx="8" class="house-room"/><text x="72" y="34" text-anchor="middle" class="house-name">STUE</text>
          <rect x="145" y="10" width="125" height="95" rx="8" class="house-room"/><text x="207" y="34" text-anchor="middle" class="house-name">KØKKEN</text>
          <rect x="280" y="10" width="125" height="95" rx="8" class="house-room"/><text x="342" y="34" text-anchor="middle" class="house-name">SOVEV.</text>
          <rect x="415" y="10" width="135" height="95" rx="8" class="house-room"/><text x="482" y="34" text-anchor="middle" class="house-name">KONTOR</text>
          <rect x="10" y="115" width="125" height="95" rx="8" class="house-room"/><text x="72" y="139" text-anchor="middle" class="house-name">BRYGGERS</text>
          <rect x="145" y="115" width="125" height="95" rx="8" class="house-room"/><text x="207" y="139" text-anchor="middle" class="house-name">ENTRE</text>
          <rect x="280" y="115" width="125" height="95" rx="8" class="house-room"/><text x="342" y="139" text-anchor="middle" class="house-name">BAD</text>
          <rect x="415" y="115" width="135" height="95" rx="8" class="house-room"/><text x="482" y="139" text-anchor="middle" class="house-name">SPISESTUE</text>
          ${allOpen.map((o, i) => {
            const pos = {
              "binary_sensor.myggbett_door_window_sensor_dor_7": [48, 78],
              "binary_sensor.myggbett_door_window_sensor_dor_8": [96, 78],
              "binary_sensor.myggbett_door_window_sensor_dor_3": [207, 78],
              "binary_sensor.myggbett_door_window_sensor_dor_6": [342, 78],
              "binary_sensor.myggbett_door_window_sensor_dor_5": [342, 96],
              "binary_sensor.myggbett_door_window_sensor_dor": [482, 78],
              "binary_sensor.myggbett_door_window_sensor_dor_4": [482, 183],
              "binary_sensor.klippbok_water_leak_sensor_water_leak": [160, 183],
              "binary_sensor.klippbok_water_leak_sensor_water_leak_2": [34, 183],
            }[o.id] || [40 + i * 24, 90];
            return `<circle cx="${pos[0]}" cy="${pos[1]}" r="4" class="house-dot ${app._on(o.id) ? "open" : ""}" data-open="${o.id}"/>`;
          }).join("")}
        </svg>
        <div class="legend"><span><i style="--c:var(--sage)"></i>lukket</span><span><i style="--c:var(--coral)"></i>åben</span></div>
      </div>
    </div>
    <div class="block"><div class="block-head"><div class="block-label">Døre & vinduer</div><div class="block-label"><b>${openings.length ? openings.length + " åbne" : "alt lukket"}</b></div></div>
      <div class="list">${allOpen.map((o) => {
        const on = app._on(o.id);
        const leakRow = o.kind === "Lækage";
        return row(esc(o.name), `${o.kind} · ${esc(o.room)}`, `<span class="status-line"><i class="dot ${on ? "warn" : ""}"></i>${leakRow ? (on ? "ALARM" : "TØR") : on ? "ÅBEN" : "LUKKET"}</span>`, { lead: icon(leakRow ? "drop" : o.kind === "Vindue" ? "wind" : "door") });
      }).join("")}</div>
    </div>
    <div class="block"><div class="block-head"><div class="block-label">Batterier</div><div class="block-label"><b>laveste først</b></div></div>
      <div class="battery-list">${batteries.map((b) => `<div class="row"><span class="row-main"><div class="row-name">${esc(b.n)}</div><div class="row-sub">${b.v < 20 ? "skift snart" : "OK"}</div></span><div class="bar" data-batt="${b.id}"><i class="${b.v < 20 ? "warn" : b.v < 40 ? "mid" : ""}" style="width:${b.v}%"></i></div><span class="row-val" style="min-width:42px;text-align:right">${Math.round(b.v)}<small>%</small></span></div>`).join("")}</div>
    </div>
    <div class="block"><div class="block-label">Automatik</div>
      <div class="row"><span class="row-main"><div class="row-name">Vindue-alarm</div><div class="row-sub">Notifikation når vinduer står åbne</div></span><button class="toggle" data-act="toggle-bool" data-entity="input_boolean.window_alert_notification" data-on="input_boolean.window_alert_notification"></button></div>
      <div class="row"><span class="row-main"><div class="row-name">Åbne vinduer</div><div class="row-sub">Live tælling</div></span><span class="row-val">${app._n("sensor.windows", 0)}</span></div>
    </div>
  </div>`;
}

function techSheet(app) {
  const rtt = app._n("sensor.192_168_110_1_round_trip_time_average");
  const google = app._n("sensor.8_8_8_8_round_trip_time_average");
  const cf = app._n("sensor.1_1_1_1_round_trip_time_average");
  const loss = app._n("sensor.192_168_110_1_packet_loss");
  const loss7 = app._n("sensor.192_168_110_1_router_packet_loss_168h");
  const jitter = app._n("sensor.192_168_110_1_jitter");
  const router = app._state("binary_sensor.192_168_110_1");
  return `${app._sheetHeader("TEKNIK", "Teknik", `router ${rtt !== null ? fmtNum(rtt, 1) + " ms" : "–"} · google ${google !== null ? fmtNum(google, 1) + " ms" : "–"} · ${loss7 !== null ? fmtNum(loss7, 2) + " % tab 7d" : "–"}`)}<div class="sheet-scroll">
    <div class="readings">${read("Router", "te_router", rtt !== null ? fmtNum(rtt, 1) : "–", "ms")}${read("Google", "te_google", google !== null ? fmtNum(google, 1) : "–", "ms")}${read("Cloudflare", "te_cf", cf !== null ? fmtNum(cf, 1) : "–", "ms")}${read("Pakketab", "te_loss", loss !== null ? fmtNum(loss, 1) : "–", "%")}</div>
    <div class="block"><div class="block-head"><div class="block-label">Netværkets puls · 6 timer</div><div class="legend"><span><i style="--c:var(--sky)"></i>Router</span><span><i style="--c:var(--sage)"></i>Google</span><span><i style="--c:var(--plum)"></i>Cloudflare</span></div></div>${chart([{ key: "techRouter", color: "var(--sky)" }, { key: "techGoogle", color: "var(--sage)" }, { key: "techCf", color: "var(--plum)" }], 150, { shared: false })}</div>
    <div class="block"><div class="block-label">Netværkskvalitet</div><div class="list">
      ${row("Router", router === "on" ? "svarer" : "svarer ikke", `<span class="status-line"><i class="dot ${router === "on" ? "" : "warn"}"></i>${router === "on" ? "OK" : "NEDE"}</span>`, { lead: icon("network") })}
      ${row("Jitter", "router", `<span class="row-val">${jitter !== null ? fmtNum(jitter, 2) : "–"}<small>ms</small></span>`, { lead: icon("wind") })}
      ${row("Pakketab 7 dage", "", `<span class="row-val">${loss7 !== null ? fmtNum(loss7, 2) : "–"}<small>%</small></span>`, { lead: icon("alert") })}
      ${row("Google", "8.8.8.8", `<span class="row-val">${google !== null ? fmtNum(google, 1) : "–"}<small>ms</small></span>`, { lead: icon("network") })}
      ${row("Cloudflare", "1.1.1.1", `<span class="row-val">${cf !== null ? fmtNum(cf, 1) : "–"}<small>ms</small></span>`, { lead: icon("network") })}
    </div></div>
    <div class="block"><div class="block-label">Inverter & datalogger</div><div class="list">
      ${row("WiFi-signal", "", `<span class="row-val">${Math.round(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_wifi_signal") ?? 0)}<small>dBm</small></span>`, { lead: icon("network") })}
      ${row("Oppetid", "", `<span class="row-val" style="font-size:13px">${Math.round((app._n("sensor.sunmate_io_pulse_ee40a0_pulse_uptime") ?? 0) / 3600)}<small>t</small></span>`, { lead: icon("clock") })}
      ${row("Pulse-temperatur", "", `<span class="row-val">${fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_temperature"), 1)}<small>°C</small></span>`, { lead: icon("thermometer") })}
      ${row("Netfrekvens", "", `<span class="row-val">${fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_frequency"), 2)}<small>Hz</small></span>`, { lead: icon("bolt") })}
      ${row("Model & firmware", "", `<span class="row-val" style="font-size:11px">${esc(app._state("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_model_fw") || "–")}</span>`, { lead: icon("info") })}
      ${row("Datalogger", "", `<span class="row-val" style="font-size:11px">${esc(app._state("sensor.sunmate_io_pulse_ee40a0_pulse_datalogger_version") || "–")}</span>`, { lead: icon("info") })}
    </div></div>
    <div class="note">RTT måles mod routeren, Google og Cloudflare. Cloudflare kan være blokeret på netværket — derfor vises den somme tider som <b>–</b>.</div>
  </div>`;
}

function ecoSheet(app) {
  const kurs = app._n("sensor.40ndasdro56_kurs");
  const change = app._n("sensor.40ndasdro56_aendring");
  const yield_ = app._n("sensor.40ndasdro56_effektiv_rente");
  const dur = app._n("sensor.40ndasdro56_varighed");
  return `${app._sheetHeader("ØKONOMI", "Økonomi", `kurs ${fmtNum(kurs, 2)} · ${change >= 0 ? "+" : ""}${fmtNum(change, 2)} i dag`)}<div class="sheet-scroll">
    <div class="block"><div class="big-read">${fmtNum(kurs, 2)}<small>kurs</small></div><div class="block-note">4,0NDASDRO56 · ${change >= 0 ? "+" : ""}${fmtNum(change, 2)} % i dag</div></div>
    <div class="readings">${read("Ændring", "ec_change", `${change >= 0 ? "+" : ""}${fmtNum(change, 2)}`, "%")}${read("Effektiv rente", "ec_yield", fmtNum(yield_, 3), "%")}${read("Varighed", "ec_dur", fmtNum(dur, 2), "år")}${read("Kurs", "ec_kurs", fmtNum(kurs, 2), "")}</div>
    <div class="block"><div class="block-label">Kursudvikling · 30 dage</div>${chart({ key: "bond", color: "var(--brass)" }, 150)}</div>
    <div class="block"><div class="block-label">Nøgletal</div><div class="list">
      ${row("Kurs", "seneste", `<span class="row-val">${fmtNum(kurs, 2)}</span>`, { lead: icon("chart") })}
      ${row("Ændring i dag", "", `<span class="row-val">${change >= 0 ? "+" : ""}${fmtNum(change, 2)}<small>%</small></span>`, { lead: icon("arrow") })}
      ${row("Effektiv rente", "", `<span class="row-val">${fmtNum(yield_, 3)}<small>%</small></span>`, { lead: icon("percent") })}
      ${row("Varighed", "", `<span class="row-val">${fmtNum(dur, 2)}<small>år</small></span>`, { lead: icon("clock") })}
    </div></div>
    <div class="note">Kursen er et øjebliksbillede af obligationen. Ændringer og nøgletal opdateres, når markedet bevæger sig.</div>
  </div>`;
}

function bonSheet(app) {
  const next = app._nextPrayer();
  const times = app._prayerTimes();
  const sun = parseTs(app._state(SUNRISE_ID));
  const maghrib = times.find((p) => p.name === "Maghrib")?.d;
  return `${app._sheetHeader("RITME", "Bedetider", next ? `${next.name} ${fmtTime(next.d)} · ${app._countdown(next.d)}` : "Dagens tider")}<div class="sheet-scroll">
    <div class="block"><div class="eyebrow">Næste bøn</div><div class="big-read">${next ? fmtTime(next.d) : "–"}<small>${next ? next.name : ""}</small></div><div class="block-note">${next ? `${next.name} om ${app._countdown(next.d).replace("om ", "")}.` : "Ingen tidspunkter fundet."}</div></div>
    <div class="block"><div class="block-label">Dagens fem bønner</div><div class="list">${times.map((p) => {
      const isNext = next && next.id === p.id;
      return `<div class="row ${isNext ? "on" : ""}"><span class="row-main"><div class="row-name" style="${isNext ? "color:var(--accent);font-weight:600" : ""}">${p.name}</div><div class="row-sub">${isNext ? "næste bøn" : "i dag"}</div></span><span class="row-val">${fmtTime(p.d)}</span>${isNext ? `<span class="chip warn">NÆSTE</span>` : ""}</div>`;
    }).join("")}</div></div>
    <div class="block"><div class="block-label">Sol</div><div class="readings">${read("Sol op", "bon_sunrise", sun ? fmtTime(sun) : "–", "")}${read("Sol ned", "bon_sunset", maghrib ? fmtTime(maghrib) : "–", "")}</div></div>
    <div class="note">Tiderne kommer fra Islamic Prayer Times og opdateres dagligt. Næste bøn vises også på døgnbuen.</div>
  </div>`;
}

function skurSheet(app) {
  const t = app._n("sensor.timmerflotte_temp_hmd_sensor_temperatur");
  const h = app._n("sensor.timmerflotte_temp_hmd_sensor_luftfugtighed");
  return `${app._sheetHeader("UDE", "Skur", `${fmtNum(t, 1)}° · ${h !== null ? Math.round(h) + " % fugt" : "–"}`)}<div class="sheet-scroll">
    <div class="readings">${read("Temperatur", "skur_t", fmtNum(t, 1), "°C")}${read("Luftfugtighed", "skur_h", h !== null ? Math.round(h) : "–", "%")}</div>
    <div class="block"><div class="block-head"><div class="block-label">Temperatur · 24 timer</div></div>${chart({ key: "sensor.timmerflotte_temp_hmd_sensor_temperatur", color: "var(--sky)" }, 120)}</div>
    <div class="block"><div class="block-head"><div class="block-label">Luftfugtighed · 24 timer</div></div>${chart({ key: "sensor.timmerflotte_temp_hmd_sensor_luftfugtighed", color: "var(--sage)" }, 100)}</div>
    <div class="note">Skuret står ude. Sensoren måler temperatur og luftfugtighed og er uafhængig af husets ventilation.</div>
  </div>`;
}

function alertsSheet(app) {
  const alerts = app._alerts();
  const body = alerts.length
    ? alerts.map((a) => {
        const sev = a.sev >= 3 ? "KRITISK" : a.sev === 2 ? "ADVARSEL" : "INFO";
        const cls = a.sev >= 3 ? "crit" : a.sev === 2 ? "warn" : "info";
        return `<div class="row alert-row" data-nav="${a.route}">
          <span class="alert-dot ${cls}"></span>
          <span class="row-main"><div class="row-name">${esc(a.title)}</div><div class="row-sub">${esc(a.text)}</div></span>
          <span class="chip ${cls}">${sev}</span>
          <span class="row-link">Se ${icon("arrow")}</span>
        </div>`;
      }).join("")
    : `<div class="empty">${icon("check")}<span>Alt er, som det skal være.<br>Ingen alarmer lige nu.</span></div>`;
  return `${app._sheetHeader("ALARMER", "Alarmer", alerts.length ? `${alerts.length} ting kræver opmærksomhed` : "alt er roligt")}<div class="sheet-scroll"><div class="block"><div class="list">${body}</div><div class="note">Alarmerne kommer fra husets egne sensorer og opdateres live. Tryk på en linje for at gå til det relevante lag.</div></div></div>`;
}

/* ---------- bindings til lagene ---------- */
export function sheetBinds(app) {
  const b = {};
  const now = app._now();
  const price = app._priceToday();
  const soc = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
  const day = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
  const pv = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0);
  const load = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower", 0);
  const grid = app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_out_total_power", 0);
  const batt = app._n("sensor.pulse_batteri_effekt", 0);
  const c = app._get("climate.nilan602_nilan");
  const l = app._get("climate.nilan602_nilan");

  // header
  if (app._route.base === "sol") b.sheet_sum = `${fmtNum(soc, 0)} % batteri · ${fmtNum(day, 1)} kWh i dag · ${fmtNum(pv, 0)} W nu`;
  if (app._route.base === "vand") b.sheet_sum = `${fmtNum(app._n("sensor.bwt_perla_day_output"), 1)} L i dag · BWT ${app._state("sensor.bwt_perla_state") || "–"} · salt ${Math.round(app._n("sensor.bwt_perla_regenerativ_level", 0))} %`;
  if (app._route.base === "sikkerhed") {
    const opens = ROOMS.flatMap((r) => r.openings || []).filter((o) => o.kind !== "Lækage" && app._on(o.id)).length;
    b.sheet_sum = `${opens ? opens + " åbne" : "alt lukket"} · ${app._on("binary_sensor.klippbok_water_leak_sensor_water_leak") || app._on("binary_sensor.klippbok_water_leak_sensor_water_leak_2") ? "vandlækage!" : "ingen lækage"}`;
  }
  if (app._route.base === "alarmer") {
    const n = app._alerts().length;
    b.sheet_sum = n ? `${n} ting kræver opmærksomhed` : "alt er roligt";
  }

  // lys
  [...LIGHTS.map((g) => g.entity), ...LIGHTS.flatMap((g) => g.members), "light.192_168_110_242_enhaettelys"].forEach((id) => {
    const st = app._get(id);
    const on = st?.state === "on";
    const pct = on && st?.attributes?.brightness ? Math.round((st.attributes.brightness / 255) * 100) : 0;
    b[`ls_${id}`] = on ? `Tændt · ${pct} %` : "Slukket";
  });

  // rum
  ROOMS.forEach((r) => {
    const t = app._tempFor(r);
    b[`rm_${r.id}_temp`] = t.v === null ? "–" : fmtNum(t.v, 1);
    b[`rm_${r.id}_hum`] = r.humidity && !app._unavail(r.humidity) ? String(Math.round(app._n(r.humidity))) : "–";
    b[`rm_${r.id}_co2`] = r.co2 && !app._unavail(r.co2) ? String(Math.round(app._n(r.co2))) : "–";
    b[`rm_${r.id}_pm`] = r.pm25 && !app._unavail(r.pm25) ? fmtNum(app._n(r.pm25), 1) : "–";
    if (r.climate) b[`rm_${r.id}_target`] = `${fmtNum(app._attr(r.climate, "temperature"), 1)}°`;
    if (r.motion) b[`rm_entre_motion`] = app._on(r.motion) ? "Aktiv" : "Rolig";
    if (r.illuminance) b[`rm_entre_lux`] = String(Math.round(app._n(r.illuminance) ?? 0));
  });

  // varme
  HEATING.forEach((h, i) => {
    const x = app._get(h.entity);
    b[`ht_${i}_target`] = `${fmtNum(x?.attributes?.temperature, 1)}°`;
  });
  HEATING_RESERVE.forEach((h, i) => {
    const x = app._get(h.entity);
    b[`hr_${i}_target`] = `${fmtNum(x?.attributes?.temperature, 1)}°`;
  });
  b.ht_std = `${fmtNum(app._n("input_number.gulvvarme_standardtemperatur"), 1)}°`;
  b.ht_low = `${fmtNum(app._n("input_number.gulvvarme_saenket_temperatur"), 1)}°`;

  // ventilation
  b.ve_t = fmtNum(app._n("sensor.nilan602_actual_room_temperature"), 1);
  b.ve_h = String(Math.round(app._n("sensor.nilan602_humidity") ?? 0));
  b.ve_step = String(Math.round(app._n("sensor.nilan602_actual_fan_step") ?? 0));
  b.ve_eff = String(Math.round(app._n("sensor.nilan602_heat_exchange_efficiency") ?? 0));
  b.ve_out = fmtNum(app._n("sensor.nilan602_outdoor_temperature"), 1) + "°";
  b.ve_in = fmtNum(app._n("sensor.nilan602_inlet_after_heater_temperature"), 1) + "°";
  b.ve_room = fmtNum(app._n("sensor.nilan602_actual_room_temperature"), 1) + "°";
  b.ve_exhaust = fmtNum(app._n("sensor.nilan602_exhaust_temperature"), 1) + "°";
  b.ve_outlet = fmtNum(app._n("sensor.nilan602_outlet_temperature"), 1) + "°";
  b.ve_target = `${fmtNum(app._attr("climate.nilan602_nilan", "temperature"), 1)}°`;
  b.ve_days_since = String(Math.round(app._n("sensor.nilan602_days_since_last_filter_change_alarm") ?? 0));
  b.ve_days = String(Math.round(app._n("sensor.nilan602_days_to_next_filter_change_alarm") ?? 0));
  b.ve_ifan = String(Math.round(app._n("sensor.nilan602_inlet_fan_speed") ?? 0));
  b.ve_efan = String(Math.round(app._n("sensor.nilan602_exhaust_fan_speed") ?? 0));

  // energi
  b.en_buy = fmtPrice(app._n("sensor.electricity_total_price"));
  b.en_sell = fmtPrice(app._n("sensor.electricity_sell_price"));
  b.en_spot = fmtPrice(app._n("sensor.nord_pool_dk2_current_price"));
  b.en_next = fmtPrice(app._n("sensor.nord_pool_dk2_next_price"));
  b.en_tesla = fmtNum(app._n("sensor.tesla_wall_connector_total_power"), 1);
  b.en_tesla_session = fmtNum(app._n("sensor.tesla_wall_connector_energi_til_sessionen"), 1);
  b.en_tesla_total = fmtNum(app._n("sensor.tesla_wall_connector_energi"), 0);
  b.en_standby = fmtNum(app._n("sensor.all_standby_power"), 1);

  // sol
  b.so_soc = fmtNum(soc, 0);
  b.so_day = fmtNum(day, 1);
  b.so_now = fmtNum(pv, 0);
  b.so_load = fmtNum(load, 0);
  b.fl_pv = fmtNum(pv, 0);
  b.fl_soc = fmtNum(soc, 0);
  b.fl_grid_unit = grid < 0 ? "KØB" : "SALG";
  b.fl_load = fmtNum(load, 0);
  b.fl_grid = fmtNum(Math.abs(grid), 0);
  b.fl_grid_unit = grid < 0 ? "KØB" : "SALG";
  b.fl_batt = fmtNum(batt, 0);
  b.so_l1 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l1"), 1);
  b.so_l2 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l2"), 1);
  b.so_l3 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l3"), 1);
  b.so_grid = fmtNum(Math.abs(grid), 0);
  b.so_pv3 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power"), 0);
  b.so_pv4 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power"), 0);
  b.so_u3 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_voltage"), 1);
  b.so_u4 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_voltage"), 1);
  b.sp_forecast = fmtNum(app._n("sensor.hjem_energy_production_today"), 1);
  b.sp_actual = fmtNum(day, 1);
  b.sp_month = fmtNum(app._n("sensor.sol_denne_maned"), 1);
  b.sp_year = fmtNum(app._n("sensor.sol_i_ar"), 1);
  b.sp_net = fmtNum(app._n("sensor.net_i_dag"), 1);
  b.sp_net2 = b.sp_net;
  b.sp_yield = fmtNum((app._n("sensor.sol_denne_maned", 0) || 0) / 9.025, 1);
  b.sp_total = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_total_production"), 0);
  b.sp_u3 = fmtNum(((app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power", 0) || 0) / 5700) * 100, 0);
  b.sp_u4 = fmtNum(((app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power", 0) || 0) / 3325) * 100, 0);
  b.sp_pv3 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power"), 0);
  b.sp_pv4 = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power"), 0);
  b.sb_temp = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_temperature"), 1);
  b.sb_volt = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_voltage"), 1);
  b.sb_amp = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_output_a"), 1);
  b.sb_inv = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_temperature"), 1);
  b.sb_lad = fmtNum(app._n("sensor.pulse_batteri_ladning"), 0);
  b.sb_afl = fmtNum(app._n("sensor.pulse_batteri_afladning"), 0);
  b.sb_eff = fmtNum(app._n("sensor.pulse_batteri_effekt"), 0);
  b.sb_soc = fmtNum(soc, 0);
  b.sb_min = `${fmtNum(app._n("number.sunmate_io_pulse_ee40a0_pulse_battery_min_soc"), 0)}%`;
  b.sb_max = `${fmtNum(app._n("number.sunmate_io_pulse_ee40a0_pulse_battery_max_soc"), 0)}%`;
  b.sf_today = fmtNum(app._n("sensor.hjem_energy_production_today"), 1);
  b.sf_rem = fmtNum(app._n("sensor.hjem_energy_production_today_remaining"), 1);
  b.sf_now = fmtNum(app._n("sensor.hjem_power_production_now"), 0);
  b.sf_next = fmtNum(app._n("sensor.hjem_energy_next_hour"), 2);
  b.sf_actual = fmtNum(app._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production"), 1);
  b.sf_tom = fmtNum(app._n("sensor.hjem_energy_production_tomorrow"), 1);
  b.sf_d2 = fmtNum(app._n("sensor.hjem_energy_production_d2"), 1);
  b.sf_d3 = fmtNum(app._n("sensor.hjem_energy_production_d3"), 1);
  b.sf_today2 = b.sf_today;
  b.sa_today = sumDelta(app, "sensor.sparet_total", 1) === null ? "–" : fmtNum(sumDelta(app, "sensor.sparet_total", 1), 0);
  b.sa_month = sumDelta(app, "sensor.sparet_total", 30) === null ? "–" : fmtNum(sumDelta(app, "sensor.sparet_total", 30), 0);
  b.sa_year = sumDelta(app, "sensor.sparet_total", 365) === null ? "–" : fmtNum(sumDelta(app, "sensor.sparet_total", 365), 0);
  b.sa_left = fmtNum(Math.max(0, (app._n("input_number.investering_solceller", 0) + app._n("input_number.investering_batteri", 0)) - app._n("sensor.sparet_total", 0)), 0);
  b.sa_inv_s = fmtNum(app._n("input_number.investering_solceller", 0), 0);
  b.sa_inv_b = fmtNum(app._n("input_number.investering_batteri", 0), 0);

  // bon & skur
  b.bon_sunrise = parseTs(app._state(SUNRISE_ID)) ? fmtTime(parseTs(app._state(SUNRISE_ID))) : "–";
  b.bon_sunset = (() => { const m = app._prayerTimes().find((p) => p.name === "Maghrib")?.d; return m ? fmtTime(m) : "–"; })();
  b.skur_t = fmtNum(app._n("sensor.timmerflotte_temp_hmd_sensor_temperatur"), 1);
  b.skur_h = String(Math.round(app._n("sensor.timmerflotte_temp_hmd_sensor_luftfugtighed") ?? 0));

  // vand
  b.wa_month = fmtNum(app._n("sensor.bwt_perla_month_output"), 0);
  b.wa_total = fmtNum((app._n("sensor.bwt_perla_total_output", 0) || 0) / 1000, 1);
  b.wa_cost = fmtNum(app._n("sensor.vandudgift_total"), 0);
  b.wa_flow = fmtNum(app._n("sensor.bwt_perla_current_flow"), 2);
  b.wa_flow2 = fmtNum(app._n("sensor.bwt_perla_current_flow"), 2);
  b.wa_salt = String(Math.round(app._n("sensor.bwt_perla_regenerativ_level", 0)));
  b.wa_days = String(Math.round(app._n("sensor.bwt_perla_regenerativ_days", 0)));
  b.wa_cap = fmtNum(app._n("sensor.bwt_perla_capacity_1"), 0);

  // teknik
  b.te_router = fmtNum(app._n("sensor.192_168_110_1_round_trip_time_average"), 2);
  b.te_google = fmtNum(app._n("sensor.8_8_8_8_round_trip_time_average"), 2);
  b.te_cf = fmtNum(app._n("sensor.1_1_1_1_round_trip_time_average"), 2);
  b.te_loss = fmtNum(app._n("sensor.192_168_110_1_packet_loss"), 1);

  // økonomi
  b.ec_kurs = fmtNum(app._n("sensor.40ndasdro56_kurs"), 2);
  b.ec_change = fmtNum(app._n("sensor.40ndasdro56_aendring"), 2);
  b.ec_yield = fmtNum(app._n("sensor.40ndasdro56_effektiv_rente"), 3);
  b.ec_dur = fmtNum(app._n("sensor.40ndasdro56_varighed"), 2);

  return b;
}

export function sheetHTML(app, route) {
  const base = route.base;
  const sub = route.sub;
  if (base === "alle") return `${app._sheetHeader("OVERSIGT", "Alle lag", "Hele hjemmet samlet ét sted. Tryk dig ind.")}<div class="sheet-scroll">${navGrid()}</div>`;
  if (base === "bon") return bonSheet(app);
  if (base === "skur") return skurSheet(app);
  if (base === "rum") return roomSheet(app, ROOMS.find((r) => r.id === sub) || ROOMS[0]);
  if (base === "ventilation") return ventSheet(app);
  if (base === "lys") return lightsSheet(app);
  if (base === "varme") return heatSheet(app);
  if (base === "energi") return energySheet(app);
  if (base === "sol") return solarSheet(app, sub || "overblik");
  if (base === "vand") return waterSheet(app);
  if (base === "sikkerhed") return securitySheet(app);
  if (base === "teknik") return techSheet(app);
  if (base === "oekonomi") return ecoSheet(app);
  if (base === "alarmer") return alertsSheet(app);
  return `${app._sheetHeader("DØGNBUEN", "Hjem", "Døgnet, rummene og husets kapitler.")}<div class="sheet-scroll"></div>`;
}

export function loadForRoute(app, base, sub) {
  if (base === "rum" && sub) {
    const r = ROOMS.find((x) => x.id === sub);
    if (r) app._ensureHistory([r.temp, r.humidity, r.co2, r.pm25].filter(Boolean), 24);
  }
  if (base === "vand") app._ensureHistory(["sensor.bwt_perla_current_flow"], 24);
  if (base === "skur") app._ensureHistory(["sensor.timmerflotte_temp_hmd_sensor_temperatur", "sensor.timmerflotte_temp_hmd_sensor_luftfugtighed"], 24);
  if (base === "teknik") app._ensureHistory(["sensor.192_168_110_1_round_trip_time_average", "sensor.8_8_8_8_round_trip_time_average", "sensor.1_1_1_1_round_trip_time_average"], 6);
  if (base === "oekonomi") app._ensureHistory(["sensor.40ndasdro56_kurs"], 720);
  if (base === "sol") {
    app._ensureHistory([
      "sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower",
      "sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower",
      "sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc",
      "sensor.sunmate_io_pulse_ee40a0_pulse_daily_production",
      "sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_charge",
      "sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_discharge",
      "sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l1",
      "sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l2",
      "sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l3",
      "sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power",
      "sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power",
      "sensor.pulse_batteri_effekt",
      "sensor.sunmate_io_pulse_ee40a0_pulse_grid_out_total_power",
    ], 168);
    if (sub === "afkast") app._ensureHistory(["sensor.sparet_total"], 8760);
  }
}

export export class ArcusSheets extends HTMLElement {
  constructor() {
    super();
    this._app = null;
    this._route = null;
  }

  set app(v) {
    this._app = v;
    if (this.isConnected && this._route) this.render();
  }

  get app() {
    return this._app;
  }

  set route(v) {
    this._route = v;
    if (this.isConnected && this._app) this.render();
  }

  get route() {
    return this._route;
  }

  connectedCallback() {
    if (this._app && this._route) this.render();
  }

  render() {
    if (!this._app || !this._route) return;
    this.innerHTML = sheetHTML(this._app, this._route);
    loadForRoute(this._app, this._route.base, this._route.sub);
  }

  binds() {
    return this._app && this._route ? sheetBinds(this._app) : {};
  }
}

if (!customElements.get("arcus-sheets")) {
  customElements.define("arcus-sheets", ArcusSheets);
}

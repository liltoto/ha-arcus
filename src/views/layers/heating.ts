import { formatNumber } from "../../format";
import { icon } from "../../render/icons";
import type {
  EntityRef,
  HeatingModel,
  HeatingReserveModel,
  HomeModel,
} from "../../types";
import type { LayerContext } from "./types";
import {
  esc,
  getEntity,
  isOn,
  languageOf,
  numberFrom,
  numberOf,
  row,
  stepper,
  toggle,
  type SheetLanguage,
} from "./room";

interface HeatingLimits {
  standard?: EntityRef;
  reduced?: EntityRef;
}

function temperature(value: number | null, language: SheetLanguage): string {
  return value === null ? "–" : `${formatNumber(value, 1, language)}°`;
}

function zoneRow(
  ctx: LayerContext,
  zone: HeatingModel,
  language: SheetLanguage,
): string {
  const { t } = ctx;
  const entity = getEntity(ctx, zone.entity.entityId) ?? zone.entity;
  const current = numberFrom(entity.attributes?.current_temperature);
  const target = numberFrom(entity.attributes?.temperature);
  const mode = entity.state;
  const on = mode !== "off";
  const opening = zone.opening
    ? isOn(ctx, zone.opening.entityId, zone.opening)
    : false;
  const name = `${esc(zone.name)}${
    opening
      ? ` <i class="status-line" style="display:inline-flex;margin-left:6px"><i class="dot warn"></i></i>`
      : ""
  }`;
  const sub = `${esc(
    t("room.heatingNow", { temp: temperature(current, language) }),
  )} · ${esc(
    entity.attributes?.hvac_action === "heating"
      ? t("room.heatingActive")
      : t("room.heatingHolding"),
  )}${opening ? ` · ${esc(t("heating.windowOpen"))}` : ""}`;

  return row(
    name,
    sub,
    `${stepper(
      zone.entity.entityId,
      "temp-step",
      0.5,
      temperature(target, language),
      language,
    )}${toggle(
      zone.entity.entityId,
      "hvac-toggle",
      on,
      true,
      t("common.toggle"),
    )}`,
  );
}

function reserveRow(
  ctx: LayerContext,
  zone: HeatingReserveModel,
  language: SheetLanguage,
): string {
  const { t } = ctx;
  const entity = getEntity(ctx, zone.entity.entityId) ?? zone.entity;
  const current = numberFrom(entity.attributes?.current_temperature);
  const target = numberFrom(entity.attributes?.temperature);
  return row(
    esc(zone.name),
    esc(t("room.heatingNow", { temp: temperature(current, language) })),
    stepper(
      zone.entity.entityId,
      "temp-step",
      0.5,
      temperature(target, language),
      language,
    ),
  );
}

/** Underfloor heating: the discovered climate zones plus reserve channels. */
export function renderHeatingSheet(ctx: LayerContext): string {
  const { model, t } = ctx;
  const language = languageOf(ctx);
  const zones = model.heating;
  const reserve = model.heatingReserve;
  const openCount = zones.filter(
    (zone) => zone.opening && isOn(ctx, zone.opening.entityId, zone.opening),
  ).length;

  const zoneBody = zones.length
    ? zones.map((zone) => zoneRow(ctx, zone, language)).join("")
    : `<div class="empty">${icon(
        "heat",
      )}<span>${esc(t("empty.dataYet"))}</span></div>`;
  const reserveBody = reserve
    .map((zone) => reserveRow(ctx, zone, language))
    .join("");

  // The legacy sheet also exposed two input_number helpers. They are not part
  // of the dynamic model, so they render only when the integration supplies
  // the optional `heatingLimits` extension.
  const limits = (model as HomeModel & { heatingLimits?: HeatingLimits })
    .heatingLimits;
  const limitsBlock =
    limits && (limits.standard || limits.reduced)
      ? `<div class="block">
          <div class="block-label">${esc(t("heating.limits"))}</div>
          ${
            limits.standard
              ? row(
                  esc(t("heating.standard")),
                  esc(t("heating.standardSub")),
                  stepper(
                    limits.standard.entityId,
                    "input-step",
                    0.5,
                    temperature(numberOf(ctx, limits.standard), language),
                    language,
                  ),
                )
              : ""
          }
          ${
            limits.reduced
              ? row(
                  esc(t("heating.reduced")),
                  esc(t("heating.reducedSub")),
                  stepper(
                    limits.reduced.entityId,
                    "input-step",
                    0.5,
                    temperature(numberOf(ctx, limits.reduced), language),
                    language,
                  ),
                )
              : ""
          }
        </div>`
      : "";

  return `${ctx.app._sheetHeader(
    t("sheet.kickerHeating"),
    t("sheet.titleHeating"),
    t("heating.summary", { zones: zones.length, open: openCount }),
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="block-label">${esc(t("heating.zones"))}</div>
      <div class="list">${zoneBody}</div>
    </div>
    ${
      reserve.length
        ? `<div class="block">
            <div class="block-label">${esc(t("heating.reserve"))}</div>
            <div class="list">${reserveBody}</div>
          </div>`
        : ""
    }
    ${limitsBlock}
    <div class="note">${esc(
      t("heating.footer", {
        zones: zones.length,
        reserve: reserve.length,
      }),
    )}</div>
  </div>`;
}

import { icon } from "../../render/icons";
import type { LightGroupModel } from "../../types";
import type { LayerContext } from "./types";
import { esc, entityName, getEntity, isOn, lightRow } from "./room";

function lightIds(groups: LightGroupModel[]): string[] {
  const ids = new Set<string>();
  for (const group of groups) {
    if (group.members.length) {
      group.members.forEach((id) => ids.add(id));
    } else {
      ids.add(group.entityId);
    }
    group.extra.forEach((id) => ids.add(id));
  }
  return [...ids];
}

function groupBlock(ctx: LayerContext, group: LightGroupModel): string {
  const { t } = ctx;
  const members = group.members
    .map((id, index) =>
      lightRow(
        ctx,
        id,
        entityName(getEntity(ctx, id), String(index + 1)),
        false,
      ),
    )
    .join("");
  const extras = group.extra
    .map((id) =>
      lightRow(
        ctx,
        id,
        entityName(getEntity(ctx, id), t("lights.hoodLight")),
        true,
      ),
    )
    .join("");
  const count = group.members.length + group.extra.length || 1;

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      group.name,
    )}</div><div class="block-label"><b>${esc(
      t("lights.groupCount", { count }),
    )}</b></div></div>
    ${lightRow(ctx, group.entityId, group.name, true)}
    ${
      group.members.length
        ? `<details class="light-details"><summary>${esc(
            t("lights.singleSpots", { count: group.members.length }),
          )}</summary>${members}</details>`
        : ""
    }
    ${extras}
  </div>`;
}

/** The house-wide light sheet: every discovered group, in room order. */
export function renderLightsSheet(ctx: LayerContext): string {
  const { model, t } = ctx;
  const groups = model.lights;
  const ids = lightIds(groups);
  const stored = model.lightStats as
    { on?: number; total?: number } | undefined;
  const total = typeof stored?.total === "number" ? stored.total : ids.length;
  const on =
    typeof stored?.on === "number"
      ? stored.on
      : ids.filter((id) => isOn(ctx, id)).length;
  const body = groups.length
    ? groups.map((group) => groupBlock(ctx, group)).join("")
    : `<div class="empty">${icon(
        "light",
      )}<span>${esc(t("empty.dataYet"))}</span></div>`;

  return `${ctx.app._sheetHeader(
    t("sheet.kickerLights"),
    t("sheet.titleLights"),
    t("lights.summary", { on, total }),
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="btn-row"><button class="btn danger" data-act="sluk-alt">${icon(
        "light",
      )} ${esc(
        t("lights.turnAllOff"),
      )}</button><span class="status-line" style="margin-left:auto"><i class="dot ${
        on ? "warn" : ""
      }"></i>${esc(
        on ? t("lights.onCount", { count: on }) : t("lights.allOff"),
      )}</span></div>
      <div data-confirm></div>
    </div>
    ${body}
    <div class="note">${esc(t("lights.footer"))}</div>
  </div>`;
}

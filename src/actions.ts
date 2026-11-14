import type { ActionConfig, ArcusConfig, ArcusHass, EntityId } from "./types";

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) return item.trim();
    }
  }
  return undefined;
}

function firstEntity(action: ActionConfig): EntityId | undefined {
  return (
    firstString(action.target?.entity_id) ??
    firstString(action.entity_id) ??
    firstString(action.data?.entity_id)
  );
}

function targetOf(action: ActionConfig): Record<string, unknown> {
  if (action.target && typeof action.target === "object") {
    return action.target;
  }
  const entityId = firstEntity(action);
  return entityId ? { entity_id: entityId } : {};
}

function hasScopedTarget(action: ActionConfig): boolean {
  return !!(
    firstString(action.target?.area_id) ?? firstString(action.target?.device_id)
  );
}

function splitService(value: string | undefined): [string, string] {
  const raw = String(value ?? "").trim();
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) {
    throw new Error(`Invalid service: ${raw || "(missing)"}`);
  }
  return [raw.slice(0, dot).trim(), raw.slice(dot + 1).trim()];
}

async function callServiceAction(
  hass: ArcusHass,
  action: ActionConfig,
  serviceValue?: string,
): Promise<void> {
  const [domain, service] = splitService(serviceValue);
  await hass.callService(domain, service, action.data ?? {}, targetOf(action));
}

/**
 * Only absolute `http(s)` URLs may reach `window.open`. A dashboard action
 * comes from user config, so `javascript:`, `data:`, `blob:`, protocol-relative
 * and relative values are open-redirect/XSS vectors and must be ignored.
 */
function safeExternalUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (!url.hostname) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
}

function openExternalAction(action: ActionConfig): void {
  const url = String(action.url_path ?? action.url ?? "").trim();
  if (!url) return;
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) return;
  const target = String(action.url_target ?? "_blank");
  window.open(safeUrl, target, "noopener,noreferrer");
}

function navigate(path: string | undefined): void {
  const raw = String(path ?? "").trim();
  if (!raw) return;

  if (raw.startsWith("#")) {
    if (typeof location !== "undefined") location.hash = raw;
    return;
  }

  if (raw.startsWith("/")) {
    try {
      window.history.pushState(null, "", raw);
    } catch {
      if (typeof location !== "undefined") location.hash = raw;
    }
    window.dispatchEvent(
      new CustomEvent("location-changed", { bubbles: true, composed: true }),
    );
    return;
  }

  if (typeof location !== "undefined") {
    location.hash = `#/${raw.replace(/^#?\/?/, "")}`;
  }
}

/**
 * Run a Home Assistant action config. The card uses this for
 * `config.quick_actions`; the supported action kinds are the ones the
 * prototype exposed plus the common HA navigation/url actions.
 */
export async function performAction(
  hass: ArcusHass,
  action: ActionConfig,
  _config?: ArcusConfig,
): Promise<void> {
  if (!action || typeof action !== "object") return;

  const kind =
    action.action ||
    (action.perform_action
      ? "perform-action"
      : action.service
        ? "call-service"
        : "");

  switch (kind) {
    case "perform-action": {
      await callServiceAction(
        hass,
        action,
        action.perform_action ?? action.service,
      );
      return;
    }

    case "call-service": {
      await callServiceAction(hass, action, action.service);
      return;
    }

    case "toggle": {
      const entityId = firstEntity(action);
      if (entityId) {
        const domain = entityId.split(".")[0];
        await callServiceAction(hass, action, `${domain}.toggle`);
        return;
      }
      if (!hasScopedTarget(action)) {
        throw new Error("A toggle action needs an entity.");
      }
      await callServiceAction(hass, action, "homeassistant.toggle");
      return;
    }

    case "navigate": {
      navigate(action.navigation_path ?? action.url_path);
      return;
    }

    case "url": {
      openExternalAction(action);
      return;
    }

    default: {
      if (action.service) {
        await callServiceAction(hass, action, action.service);
        return;
      }
      throw new Error(`Unsupported action: ${kind || "unknown"}`);
    }
  }
}

export { firstEntity };

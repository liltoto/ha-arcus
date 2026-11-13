import type { ActionConfig, ArcusConfig, ArcusHass, EntityId } from "./types";

function firstEntity(action: ActionConfig): EntityId | undefined {
  const candidates = [
    action.target?.entity_id,
    action.entity_id,
    action.data?.entity_id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (Array.isArray(candidate)) {
      const first = candidate.find(
        (item): item is string => typeof item === "string" && !!item.trim(),
      );
      if (first) return first.trim();
    }
  }
  return undefined;
}

function targetOf(action: ActionConfig): Record<string, unknown> {
  if (action.target && typeof action.target === "object") {
    return action.target;
  }
  const entityId = firstEntity(action);
  return entityId ? { entity_id: entityId } : {};
}

function splitService(value: string | undefined): [string, string] {
  const raw = String(value ?? "").trim();
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) {
    throw new Error(`Invalid service: ${raw || "(missing)"}`);
  }
  return [raw.slice(0, dot), raw.slice(dot + 1)];
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
      const [domain, service] = splitService(
        action.perform_action ?? action.service,
      );
      await hass.callService(
        domain,
        service,
        action.data ?? {},
        targetOf(action),
      );
      return;
    }

    case "call-service": {
      const [domain, service] = splitService(action.service);
      await hass.callService(
        domain,
        service,
        action.data ?? {},
        targetOf(action),
      );
      return;
    }

    case "toggle": {
      const entityId = firstEntity(action);
      if (!entityId) throw new Error("A toggle action needs an entity.");
      const domain = entityId.split(".")[0];
      const target =
        action.target && typeof action.target === "object"
          ? action.target
          : { entity_id: entityId };
      await hass.callService(domain, "toggle", action.data ?? {}, target);
      return;
    }

    case "navigate": {
      navigate(action.navigation_path ?? action.url_path);
      return;
    }

    case "url": {
      const url = String(action.url_path ?? action.url ?? "").trim();
      if (!url) return;
      const target = String(action.url_target ?? "_blank");
      window.open(url, target, "noopener,noreferrer");
      return;
    }

    default: {
      if (action.service) {
        const [domain, service] = splitService(action.service);
        await hass.callService(
          domain,
          service,
          action.data ?? {},
          targetOf(action),
        );
        return;
      }
      throw new Error(`Unsupported action: ${kind || "unknown"}`);
    }
  }
}

export { firstEntity };

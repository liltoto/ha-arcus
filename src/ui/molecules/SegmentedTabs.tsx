import { useEffect, useRef } from "react";
import { Tab } from "../atoms/Tab";
import type { TabItem } from "../view-types";
import { c } from "../styles/classes";

export interface SegmentedTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/**
 * The horizontally scrolling route tabs under a sheet header.
 *
 * The strip keeps the active tab visible and exposes the `can-left` /
 * `can-right` classes that fade only the edges hiding more tabs. The classes
 * are recomputed after mount, on scroll, on resize, and whenever the active
 * route changes.
 */
export function SegmentedTabs({ tabs, active, onChange }: SegmentedTabsProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const sync = (): void => {
      const scrollable = strip.scrollWidth > strip.clientWidth + 1;
      strip.classList.toggle("scrollable", scrollable);
      strip.classList.toggle("can-left", scrollable && strip.scrollLeft > 1);
      strip.classList.toggle(
        "can-right",
        scrollable &&
          strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4,
      );
    };

    const activeTab = strip.querySelector<HTMLElement>(".tab.active");
    if (activeTab) {
      const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
      let next = strip.scrollLeft;
      if (activeTab === strip.lastElementChild) {
        next = max;
      } else if (activeTab.offsetLeft < next) {
        next = activeTab.offsetLeft;
      } else if (
        activeTab.offsetLeft + activeTab.offsetWidth >
        next + strip.clientWidth
      ) {
        next = activeTab.offsetLeft + activeTab.offsetWidth - strip.clientWidth;
      }
      strip.scrollLeft = Math.max(0, Math.min(max, next));
    }
    sync();

    strip.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const frame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(sync)
        : null;

    return () => {
      strip.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active, tabs]);

  return (
    <div className={c("sheet-tabs")} ref={stripRef} role="tablist">
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          dataTab={tab.key}
          active={tab.key === active}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </Tab>
      ))}
    </div>
  );
}

import { Tab } from "../atoms/Tab";
import type { TabItem } from "../view-types";

export interface SegmentedTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/** The horizontally scrolling route tabs under a sheet header. */
export function SegmentedTabs({ tabs, active, onChange }: SegmentedTabsProps) {
  return (
    <div className="sheet-tabs">
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

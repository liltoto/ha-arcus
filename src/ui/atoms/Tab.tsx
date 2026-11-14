import type { ReactNode } from "react";

export interface TabProps {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
  dataTab?: string;
}

export function Tab({
  active,
  children,
  onClick,
  className,
  dataTab,
}: TabProps) {
  const classes = ["tab", active ? "active" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={active}
      data-tab={dataTab}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

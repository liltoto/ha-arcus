import type { ReactNode } from "react";

export interface TabProps {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export function Tab({ active, children, onClick, className }: TabProps) {
  const classes = ["tab", active ? "active" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

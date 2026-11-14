import type { ReactNode } from "react";
import { c } from "../styles/classes";

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
  return (
    <button
      type="button"
      className={c("tab", active && "active", className)}
      aria-pressed={active}
      data-tab={dataTab}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

import type { ReactNode } from "react";
import { c } from "../styles/classes";

export interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  className?: string;
}

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <span className={c("pill", tone === "default" ? "" : tone, className)}>
      {children}
    </span>
  );
}

import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  className?: string;
}

export function Badge({ children, tone = "default", className }: BadgeProps) {
  const classes = ["pill", tone === "default" ? "" : tone, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}

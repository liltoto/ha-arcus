import { c } from "../styles/classes";

export interface DotProps {
  tone?: "ok" | "warn" | "off" | "muted";
  className?: string;
}

export function Dot({ tone = "ok", className }: DotProps) {
  return <i className={c("sdot", tone === "ok" ? "" : tone, className)} />;
}

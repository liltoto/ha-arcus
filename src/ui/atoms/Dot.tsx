export interface DotProps {
  tone?: "ok" | "warn" | "off" | "muted";
  className?: string;
}

export function Dot({ tone = "ok", className }: DotProps) {
  const classes = ["sdot", tone === "ok" ? "" : tone, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return <i className={classes} />;
}

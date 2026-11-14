import type { ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  tone?: "default" | "primary" | "danger";
  size?: "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  tone = "default",
  size = "md",
  onClick,
  disabled,
  className,
}: ButtonProps) {
  const classes = [
    "btn",
    tone !== "default" ? tone : "",
    size === "sm" ? "small" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

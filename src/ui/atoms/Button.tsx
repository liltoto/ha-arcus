import type { ReactNode } from "react";
import { c } from "../styles/classes";

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
  return (
    <button
      type="button"
      className={c(
        "btn",
        tone !== "default" ? tone : "",
        size === "sm" ? "small" : "",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

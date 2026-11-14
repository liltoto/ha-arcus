import type { KeyboardEvent } from "react";

/**
 * Enter/Space activation for a clickable div row. Rows get button semantics
 * through role/tabIndex, so they must handle the same keys a button would.
 */
export function rowActivation(
  onClick?: () => void,
): (event: KeyboardEvent<HTMLDivElement>) => void {
  return (event) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };
}

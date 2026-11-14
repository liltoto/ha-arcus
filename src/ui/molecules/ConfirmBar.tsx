import { c } from "../styles/classes";
export interface ConfirmBarProps {
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmAct?: string;
}

/**
 * The sticky destructive-action confirmation. The card's legacy confirm used
 * `cancel-confirm` for the cancel button and a per-action data-act for the
 * confirmation; `confirmAct` keeps that hook available to the sheet page.
 */
export function ConfirmBar({
  text,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmAct = "confirm-yes",
}: ConfirmBarProps) {
  return (
    <div className={c("confirm")} data-confirm>
      <span className={c("txt")}>{text}</span>
      <button
        type="button"
        className={c("btn small")}
        data-act="cancel-confirm"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        className={c("btn small danger")}
        data-act={confirmAct}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

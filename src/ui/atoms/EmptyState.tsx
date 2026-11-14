import { Icon } from "./Icon";
import { c } from "../styles/classes";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className={c("empty")}>
      {icon ? <Icon name={icon} /> : null}
      <div>
        <b>{title}</b>
        {hint ? (
          <>
            <br />
            {hint}
          </>
        ) : null}
      </div>
    </div>
  );
}

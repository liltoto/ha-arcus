import { Icon } from "./Icon";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="empty">
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

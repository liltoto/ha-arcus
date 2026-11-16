import { Component, type ErrorInfo, type ReactNode } from "react";
import { useAtmo, useConfig, useDark, useTranslator } from "../hooks";
import { c } from "../styles/classes";

interface AppBoundaryProps {
  children: ReactNode;
}

interface AppBoundaryState {
  error: Error | null;
}

/**
 * The themed failure panel. It renders its own `.app` shell because the error
 * may have replaced `HomeTemplate` itself; the theme attributes keep the
 * fallback visually part of the dashboard.
 */
const AppFailure = ({ onRetry }: { onRetry: () => void }) => {
  const config = useConfig();
  const atmo = useAtmo();
  const dark = useDark();
  const t = useTranslator();

  return (
    <div
      className={c("app", !dark && "light")}
      data-atmo={atmo}
      data-density={config.density}
      data-text={config.text_scale}
    >
      <div className={c("failure")}>
        <div className={c("failure-panel")} role="alert">
          <span className={c("failure-kicker")}>{t("failure.kicker")}</span>
          <h2 className={c("failure-title")}>{t("failure.title")}</h2>
          <p className={c("failure-body")}>{t("failure.body")}</p>
          <button
            type="button"
            className={c("failure-retry")}
            onClick={onRetry}
          >
            {t("failure.retry")}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Contains a render exception to this card. React 19 removes the whole root
 * when an error escapes, which would blank the dashboard and, worse, repeat on
 * every state push; a boundary turns that into one recoverable panel.
 */
export class AppBoundary extends Component<AppBoundaryProps, AppBoundaryState> {
  state: AppBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[arcus] render failed", error, info.componentStack);
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) return <AppFailure onRetry={this.retry} />;
    return this.props.children;
  }
}

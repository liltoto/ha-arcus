import type { AtmosphereSetting } from "../types";
import { HomePage } from "./pages/HomePage";
import { ArcusProvider } from "./providers/ArcusProvider";
import type { ArcusProviderProps } from "./types";

export interface ArcusAppProps extends Omit<ArcusProviderProps, "children"> {
  atmo: AtmosphereSetting;
  dark: boolean;
}

/**
 * The single React root rendered inside `<arcus-card>`. It forwards the
 * card's state to the provider and mounts the current page.
 */
export function ArcusApp({
  atmo,
  dark,
  ...provider
}: ArcusAppProps) {
  return (
    <ArcusProvider {...provider}>
      <HomePage atmo={atmo} dark={dark} />
    </ArcusProvider>
  );
}

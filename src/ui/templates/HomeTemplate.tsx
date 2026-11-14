import type { AtmosphereSetting, DensitySetting } from "../../types";
import { ChapterGrid } from "../organisms/ChapterGrid";
import { Footer } from "../organisms/Footer";
import { Hero } from "../organisms/Hero";
import { QuickActions } from "../organisms/QuickActions";
import { RoomGrid } from "../organisms/RoomGrid";
import { TopBar } from "../organisms/TopBar";
import { Vitals } from "../organisms/Vitals";

export interface HomeTemplateProps {
  atmo: AtmosphereSetting;
  dark: boolean;
  density: DensitySetting;
  sheetOpen: boolean;
  /** Localized accessible name for the empty sheet dialog. */
  sheetLabel: string;
}

/**
 * Static subset of the legacy generated star field. The visual design only
 * needs a handful of animated points; the next home pass can restore the full
 * eighteen if the baselines ask for them.
 */
const STARS = [
  { x: 8, y: 8, delay: 0, opacity: 0.2 },
  { x: 18, y: 18, delay: 0.37, opacity: 0.32 },
  { x: 27, y: 12, delay: 0.74, opacity: 0.44 },
  { x: 36, y: 22, delay: 1.11, opacity: 0.56 },
  { x: 45, y: 7, delay: 1.48, opacity: 0.2 },
  { x: 54, y: 16, delay: 1.85, opacity: 0.32 },
  { x: 63, y: 9, delay: 2.22, opacity: 0.44 },
  { x: 71, y: 20, delay: 2.59, opacity: 0.56 },
] as const;

/**
 * The portal-free home shell. Class names and the `data-*` hooks mirror the
 * legacy `renderHome` markup so the card's sheet, toast, graph, and theme
 * helpers keep working while the organisms are ported.
 */
export function HomeTemplate({
  atmo,
  dark,
  density,
  sheetOpen,
  sheetLabel,
}: HomeTemplateProps) {
  return (
    <div
      className={`app${dark ? "" : " light"}`}
      data-atmo={atmo}
      data-density={density}
    >
      <div className="sky" />
      <div className="stars">
        {STARS.map((star) => (
          <i
            key={`${star.x}-${star.y}`}
            className="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: `${star.delay}s`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
      <div className="scroll">
        <header className="topbar">
          <TopBar />
        </header>
        <main className="wrap">
          <section className="hero">
            <Hero />
            <Vitals />
          </section>
          <section className="section">
            <RoomGrid />
          </section>
          <section className="section">
            <ChapterGrid />
          </section>
          <section className="section">
            <QuickActions />
          </section>
          <footer className="footer">
            <Footer />
          </footer>
        </main>
      </div>
      <div className="scrim" data-scrim />
      <section
        className={`sheet${sheetOpen ? " open" : ""}`}
        data-sheet
        role="dialog"
        aria-modal="true"
        aria-label={sheetLabel}
      />
      <div className="toast" data-toast />
      <div className="graph-tip" data-graph-tip aria-hidden="true" />
      <div className="graph-cursor" data-graph-cursor aria-hidden="true" />
    </div>
  );
}

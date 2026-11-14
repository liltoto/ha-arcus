import type { AtmosphereSetting, DensitySetting } from "../../types";
import { ChapterGrid } from "../organisms/ChapterGrid";
import { Footer } from "../organisms/Footer";
import { Hero } from "../organisms/Hero";
import { QuickActions } from "../organisms/QuickActions";
import { RoomGrid } from "../organisms/RoomGrid";
import { SheetFrame } from "../organisms/SheetFrame";
import { TopBar } from "../organisms/TopBar";
import { Vitals } from "../organisms/Vitals";

export interface HomeTemplateProps {
  atmo: AtmosphereSetting;
  dark: boolean;
  density: DensitySetting;
}

/** The eighteen-point star field from the original home view. */
const STAR_X = [
  8, 18, 27, 36, 45, 54, 63, 71, 79, 86, 92, 14, 31, 58, 68, 76, 88, 4,
];
const STAR_Y = [
  8, 18, 12, 22, 7, 16, 9, 20, 13, 6, 18, 26, 5, 24, 11, 3, 22, 15,
];
const STARS = STAR_X.map((x, index) => ({
  x,
  y: STAR_Y[index],
  delay: index * 0.37,
  opacity: 0.2 + (index % 5) * 0.12,
}));

/**
 * The portal-free home shell. Class names and the `data-*` hooks mirror the
 * legacy `renderHome` markup so the card's sheet, toast, graph, and theme
 * helpers keep working while the organisms are ported.
 */
export function HomeTemplate({ atmo, dark, density }: HomeTemplateProps) {
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
          <QuickActions />
          <footer className="footer">
            <Footer />
          </footer>
        </main>
      </div>
      <SheetFrame />
      <div className="toast" data-toast />
      <div className="graph-tip" data-graph-tip aria-hidden="true" />
      <div className="graph-cursor" data-graph-cursor aria-hidden="true" />
    </div>
  );
}

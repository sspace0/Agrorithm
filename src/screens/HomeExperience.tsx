import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Layers,
  Compass,
} from "lucide-react";
import { Diorama } from "../components/Diorama";
import ScrollStory from "../components/ScrollStory";
import { asset, BRAND } from "../config";

export default function HomeExperience({
  motion,
  quality,
  lang,
  start,
  resume,
  saved,
}: {
  motion: boolean;
  quality: string;
  lang: string;
  start: (sample: boolean) => void;
  resume: () => void;
  saved: boolean;
}) {
  return (
    <main className="experience-home" id="main-content">
      <section className="cinema-hero" aria-labelledby="home-title">
        <div className="hero-coordinate">
          <span className="live-dot" /> EARTH OBSERVATIONS. GROUNDED DECISIONS.
          <span>32.1° N / 73.0° E</span>
        </div>
        <div className="cinema-copy">
          <span className="eyebrow">A NEW PERSPECTIVE ON YOUR FIELD</span>
          <h1 id="home-title">
            A different
            <br />
            season <span>starts here.</span>
          </h1>
          <p>
            Your soil has a story.
            <br />
            Explore its next chapter with NASA data.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => start(false)}>
              {lang === "ur" ? "منصوبہ شروع کریں" : "Start planning"}
              <ArrowUpRight size={20} />
            </button>
            <button className="text-action" onClick={() => start(true)}>
              {lang === "ur" ? "نمونہ کھیت آزمائیں" : "Try a sample farm"}
              <ArrowRight size={18} />
            </button>
          </div>
          {saved && (
            <button className="resume" onClick={resume}>
              Resume your saved plan <ArrowRight size={16} />
            </button>
          )}
        </div>
        <div className="cinema-art">
          <div className="hero-halo" />
          <Diorama motion={motion} quality={quality} />
        </div>
        <div className="hero-baseline">
          <button
            onClick={() =>
              document
                .getElementById("soil-story")
                ?.scrollIntoView({ behavior: motion ? "smooth" : "instant" })
            }
          >
            <ArrowDown size={17} /> Scroll to look deeper
          </button>
          <span>
            <MapPin size={15} /> PUNJAB, PAKISTAN · CONFIGURABLE PILOT
          </span>
          <a href="#/soil">
            Explore beneath the surface <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <ScrollStory motion={motion} quality={quality} />
      <section className="map-portal" aria-labelledby="portal-title">
        <img
          src={asset("images/blue-marble-2004-08.jpg")}
          alt=""
          loading="lazy"
        />
        <div className="portal-shade" />
        <div className="portal-copy">
          <span className="eyebrow">
            <Compass size={16} /> FIND YOUR GROUND
          </span>
          <h2 id="portal-title">
            One planet.
            <br />
            Different possibilities.
          </h2>
          <p>
            Search a place. Explore satellite imagery, climate zones, and the
            conditions different crops need.
          </p>
          <a className="primary" href="#/atlas">
            Search the crop atlas <ArrowUpRight size={19} />
          </a>
          <small>
            NASA Blue Marble · August 2004 composite.
            <br />
            Climate and crop screening layers open in the atlas.
          </small>
        </div>
        <div className="portal-marker">
          <i />
          <span>
            Punjab pilot
            <br />
            <small>32.1° N · 73.0° E</small>
          </span>
        </div>
      </section>
      <section className="home-paths">
        <div>
          <span className="eyebrow">MAKE YOUR NEXT MOVE</span>
          <h2>
            Less guesswork.
            <br />
            More perspective.
          </h2>
        </div>
        <div className="path-links">
          <a href="#/studio/setup">
            <span>01</span>
            <div>
              <h3>Plan a field</h3>
              <p>Set your crops, soil and practical limits.</p>
            </div>
            <ArrowUpRight />
          </a>
          <a href="#/soil">
            <span>02</span>
            <div>
              <h3>Go beneath the surface</h3>
              <p>Inspect roots, layers and water in 3D.</p>
            </div>
            <Layers />
          </a>
          <a href="#/help">
            <span>03</span>
            <div>
              <h3>Find an answer</h3>
              <p>Search the guide. No key or account needed.</p>
            </div>
            <ArrowUpRight />
          </a>
        </div>
      </section>
      <footer className="experience-footer">
        <a className="wordmark" href="#/">
          {BRAND.name}
        </a>
        <span>NASA SPACE APPS 2026 · jt_1</span>
        <a href="#/sources">Sources & methods</a>
        <a href="#/about">Meet the team</a>
        <span>Your field stays on your device.</span>
      </footer>
    </main>
  );
}

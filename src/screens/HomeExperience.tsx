import { ArrowUpRight, Layers, Compass } from "lucide-react";
import OrbitOpening from "../components/OrbitOpening";
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
      <OrbitOpening
        motion={motion}
        quality={quality}
        lang={lang}
        start={start}
        resume={resume}
        saved={saved}
      />
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

import { ArrowUpRight, Layers, Compass, Globe2, Sprout } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { coverMapPoint } from "../engine/presentation";
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
  const portal = useRef<HTMLElement>(null),
    map = useRef<HTMLImageElement>(null);
  const [pilot, setPilot] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const update = () => {
      if (!portal.current || !map.current) return;
      const a = portal.current.getBoundingClientRect(),
        b = map.current.getBoundingClientRect(),
        p = coverMapPoint(b.width, b.height, 32.1, 73);
      setPilot({ x: b.left - a.left + p.x, y: b.top - a.top + p.y });
    };
    const observer = new ResizeObserver(update);
    if (portal.current) observer.observe(portal.current);
    if (map.current) observer.observe(map.current);
    update();
    return () => observer.disconnect();
  }, []);
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
      <section className="exhibition-prologue" aria-labelledby="prologue-title">
        <div className="prologue-heading">
          <span className="eyebrow">01 / A CLOSER LOOK</span>
          <h2 id="prologue-title">
            From a planet.
            <br />
            <em>To your next season.</em>
          </h2>
          <p>
            Begin with what we can observe. Add what you know about your field.
            Explore the choices between them.
          </p>
        </div>
        <div className="prologue-evidence">
          <a href="#/sources">
            <Globe2 size={23} />
            <span>Earth observations</span>
            <p>
              Historical NASA weather and a quality-filtered vegetation record.
            </p>
            <ArrowUpRight size={19} />
          </a>
          <a href="#/soil">
            <Layers size={23} />
            <span>Beneath the surface</span>
            <p>
              Roots, soil layers and water. Measurements stay separate from
              illustrations.
            </p>
            <ArrowUpRight size={19} />
          </a>
          <a href="#/crops">
            <Sprout size={23} />
            <span>Explore crop options</span>
            <p>
              Eight crop references. Four botanical models. A clearer place to
              start.
            </p>
            <ArrowUpRight size={19} />
          </a>
        </div>
      </section>
      <ScrollStory motion={motion} quality={quality} />
      <section
        ref={portal}
        className="map-portal"
        aria-labelledby="portal-title"
      >
        <img
          ref={map}
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
        <div
          className="portal-marker"
          data-latitude="32.1"
          data-longitude="73"
          style={{
            left: pilot?.x ?? 0,
            top: pilot?.y ?? 0,
            visibility: pilot ? "visible" : "hidden",
          }}
        >
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

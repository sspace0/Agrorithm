import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Diorama } from "./Diorama";
export default function ScrollStory({
  motion,
  quality,
}: {
  motion: boolean;
  quality: string;
}) {
  const el = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!motion) {
      setProgress(0);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.current?.getBoundingClientRect();
        if (rect)
          setProgress(
            Math.max(
              0,
              Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
            ),
          );
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [motion]);
  const step = progress < 0.33 ? 0 : progress < 0.67 ? 1 : 2;
  const text = [
    [
      "Above ground",
      "Every season leaves a trace.",
      "A crop is only the visible part. Follow its roots to the soil that supports it.",
    ],
    [
      "Follow the roots",
      "Go beneath the obvious.",
      "Explore how water moves through a root zone. Layer separation is illustrative—not a prediction of soil change.",
    ],
    [
      "Make a different choice",
      "See the whole system.",
      "Bring weather, soil and practical constraints into one conversation. Compare the possibilities before choosing.",
    ],
  ][motion ? step : 0];
  return (
    <section
      className={`scroll-story ${motion ? "" : "static-story"}`}
      ref={el}
      aria-label="Scroll through the soil illustration"
    >
      <div className="story-sticky">
        <div className="story-copy">
          <span className="eyebrow">
            A CLOSER LOOK · {String(step + 1).padStart(2, "0")} / 03
          </span>
          <span className="story-kicker">{text[0]}</span>
          <h2>{text[1]}</h2>
          <p>{text[2]}</p>
          <a className="text-action" href="#/soil">
            Open the soil explorer <ArrowUpRight size={17} />
          </a>
          <span className="story-scroll">
            <ArrowDown size={15} />
            {motion
              ? "Scroll to turn the cutaway"
              : "Reduced motion · static view"}
          </span>
          <div className="story-progress">
            <i style={{ width: `${motion ? progress * 100 : 100}%` }} />
          </div>
        </div>
        <Diorama motion={motion} quality={quality} progress={progress} />
      </div>
    </section>
  );
}

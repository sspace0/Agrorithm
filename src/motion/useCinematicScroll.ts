import { useEffect } from "react";
import { installCinematicScroll } from "./cinematicScroll";
import "./cinematicScroll.css";

export function useCinematicScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose: (() => void) | undefined;
    const update = () => {
      dispose?.();
      dispose = reduced.matches ? undefined : installCinematicScroll();
    };
    update();
    reduced.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      dispose?.();
    };
  }, [enabled]);
}

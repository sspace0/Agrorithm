export const CINEMATIC_SCROLL_SCALE = 0.25;

/** Wheel units are pixels, lines (16 CSS px), or viewport pages. */
export function normalizeCinematicWheelDelta(
  delta: number,
  mode: number,
  pageHeight: number,
) {
  if (!Number.isFinite(delta)) return 0;
  const unit = mode === 1 ? 16 : mode === 2 ? Math.max(1, pageHeight) : 1;
  return delta * unit * CINEMATIC_SCROLL_SCALE;
}

function hasNativeScrollTarget(event: WheelEvent, win: Window) {
  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) continue;
    if (target.matches("input,textarea,select,dialog,[role=dialog],[role=log],[data-native-scroll]") ||
      (target instanceof HTMLElement && target.isContentEditable)) return true;
    if (target === win.document.body || target === win.document.documentElement) continue;
    const style = win.getComputedStyle(target);
    if (/auto|scroll|overlay/.test(style.overflowY) && target.scrollHeight > target.clientHeight + 1) return true;
  }
  return false;
}

/** Installs one bounded, interruptible wheel animator; idle pages schedule no frames. */
export function installCinematicScroll(win: Window = window) {
  const root = win.document.documentElement;
  const previousAttribute = root.getAttribute("data-cinematic-scroll");
  root.setAttribute("data-cinematic-scroll", "");
  let frame = 0;
  let target = win.scrollY;
  let position = win.scrollY;
  let lastWrite = win.scrollY;
  let previousTime = 0;
  const limit = () => Math.max(0, root.scrollHeight - win.innerHeight);
  const cancel = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    target = position = lastWrite = win.scrollY;
  };
  const externallyMoved = () => Math.abs(win.scrollY - lastWrite) > 3;
  const tick = (time: number) => {
    if (externallyMoved()) {
      cancel();
      return;
    }
    const elapsed = previousTime ? Math.min(64, time - previousTime) : 16;
    previousTime = time;
    target = Math.max(0, Math.min(limit(), target));
    const remaining = target - position;
    const next = Math.abs(remaining) < 1
      ? target
      : position + remaining * (1 - Math.exp(-elapsed / 110));
    position = next;
    win.scrollTo({ top: next, left: win.scrollX, behavior: "instant" });
    lastWrite = win.scrollY;
    if (Math.abs(target - position) <= 1) {
      win.scrollTo({ top: target, left: win.scrollX, behavior: "instant" });
      lastWrite = win.scrollY;
      frame = 0;
      previousTime = 0;
    } else {
      frame = win.requestAnimationFrame(tick);
    }
  };
  const wheel = (event: WheelEvent) => {
    // Bubble after native map/model handlers so their preventDefault wins.
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey ||
      event.shiftKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
      hasNativeScrollTarget(event, win)) {
      cancel();
      return;
    }
    if (externallyMoved()) cancel();
    if (!frame) {
      position = win.scrollY;
      // Keep the fraction rounded by the browser, so tiny trackpad ticks add up.
      if (Math.abs(target - position) > 1) target = position;
    }
    const delta = normalizeCinematicWheelDelta(event.deltaY, event.deltaMode, win.innerHeight);
    const nextTarget = Math.max(0, Math.min(limit(), target + delta));
    if (nextTarget === target) {
      if (frame) event.preventDefault();
      return;
    }
    event.preventDefault();
    target = nextTarget;
    lastWrite = win.scrollY;
    if (!frame) frame = win.requestAnimationFrame(tick);
  };
  const scrolled = () => {
    if (frame && externallyMoved()) cancel();
  };
  win.addEventListener("wheel", wheel, { passive: false });
  win.addEventListener("scroll", scrolled, { passive: true });
  win.addEventListener("pointerdown", cancel, { passive: true });
  win.addEventListener("touchstart", cancel, { passive: true });
  win.addEventListener("keydown", cancel);
  win.addEventListener("hashchange", cancel);
  return () => {
    cancel();
    win.removeEventListener("wheel", wheel);
    win.removeEventListener("scroll", scrolled);
    win.removeEventListener("pointerdown", cancel);
    win.removeEventListener("touchstart", cancel);
    win.removeEventListener("keydown", cancel);
    win.removeEventListener("hashchange", cancel);
    if (previousAttribute === null) root.removeAttribute("data-cinematic-scroll");
    else root.setAttribute("data-cinematic-scroll", previousAttribute);
  };
}

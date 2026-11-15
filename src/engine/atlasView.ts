export type AtlasView = { zoom: number; x: number; y: number };
export const ATLAS_MAX_ZOOM = 24;
export function boundAtlasView(view: AtlasView): AtlasView {
  const zoom = Math.max(
    1,
    Math.min(ATLAS_MAX_ZOOM, Number.isFinite(view.zoom) ? view.zoom : 1),
  );
  const limit = 1 - zoom;
  return {
    zoom,
    x: Math.max(limit, Math.min(0, Number.isFinite(view.x) ? view.x : 0)),
    y: Math.max(limit, Math.min(0, Number.isFinite(view.y) ? view.y : 0)),
  };
}
/** Keep the same geographic pixel beneath a normalized viewport anchor. */
export function zoomAtlasAt(
  view: AtlasView,
  targetZoom: number,
  anchor: { x: number; y: number },
): AtlasView {
  const zoom = boundAtlasView({ ...view, zoom: targetZoom }).zoom;
  const ratio = zoom / view.zoom;
  return boundAtlasView({
    zoom,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  });
}
export function atlasPointAt(view: AtlasView, point: { x: number; y: number }) {
  return {
    x: (point.x - view.x) / view.zoom,
    y: (point.y - view.y) / view.zoom,
  };
}
export function centerAtlasAt(
  view: AtlasView,
  point: { x: number; y: number },
): AtlasView {
  return boundAtlasView({
    zoom: view.zoom,
    x: 0.5 - point.x * view.zoom,
    y: 0.5 - point.y * view.zoom,
  });
}

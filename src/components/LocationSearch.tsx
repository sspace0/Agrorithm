import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Globe2 } from "lucide-react";
import { asset } from "../config";
import { parseCoordinates, parsePlaces, type Place } from "../engine/locations";
export default function LocationSearch({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) {
  const [q, setQ] = useState("");
  const [cached, setCached] = useState<Place[]>([]);
  const [online, setOnline] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  useEffect(() => {
    fetch(asset("data/places.json"))
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setCached(parsePlaces({ results: d.places })))
      .catch(() => {});
    return () => controller.current?.abort();
  }, []);
  const coordinates = parseCoordinates(q);
  const local = q.trim()
    ? cached.filter((p) =>
        `${p.name} ${p.country} ${p.admin1}`
          .toLowerCase()
          .includes(q.toLowerCase().trim()),
      )
    : cached.slice(0, 4);
  const results = coordinates
    ? [coordinates]
    : [...local, ...online.filter((p) => !local.some((c) => c.id === p.id))];
  const choose = (p: Place) => {
    requestVersion.current++;
    controller.current?.abort();
    setBusy(false);
    onPick(p.latitude, p.longitude);
    setNote(
      `Selected ${p.name} · ${p.latitude.toFixed(4)}°, ${p.longitude.toFixed(4)}°. Place coordinates are not field boundaries.`,
    );
  };
  async function searchOnline() {
    if (coordinates) {
      choose(coordinates);
      return;
    }
    if (q.trim().length < 2) {
      setNote("Enter at least two characters, or latitude, longitude.");
      return;
    }
    if (/^[\d+.,\s-]+$/.test(q) && q.includes(",")) {
      setNote("Coordinates must be latitude −90 to 90, longitude −180 to 180.");
      return;
    }
    controller.current?.abort();
    const version = ++requestVersion.current;
    const ac = new AbortController();
    controller.current = ac;
    const timer = setTimeout(() => ac.abort(), 8000);
    setBusy(true);
    setNote("");
    setOnline([]);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim().slice(0, 100))}&count=8&language=en&format=json`,
        { signal: ac.signal },
      );
      if (!r.ok) throw Error(`Provider returned ${r.status}`);
      const places = parsePlaces(await r.json());
      if (version !== requestVersion.current) return;
      setOnline(places);
      setNote(
        places.length
          ? "Online place results · select a result below."
          : "No place found. Try a town name, country, or coordinates.",
      );
    } catch {
      if (version !== requestVersion.current) return;
      setNote(
        "Online place search is unavailable. Cached places and latitude, longitude still work.",
      );
    } finally {
      clearTimeout(timer);
      if (version === requestVersion.current) setBusy(false);
    }
  }
  return (
    <section className="location-search" aria-label="Find a map location">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (coordinates) choose(coordinates);
          else if (local.length === 1) choose(local[0]);
          else void searchOnline();
        }}
      >
        <label>
          <MapPin size={20} />
          <span>Find your place</span>
          <input
            type="search"
            aria-label="Search map locations"
            placeholder="Town, country or 32.1, 73.0"
            value={q}
            onChange={(e) => {
              requestVersion.current++;
              controller.current?.abort();
              setBusy(false);
              setQ(e.target.value);
              setOnline([]);
              setNote("");
            }}
          />
        </label>
        <button className="primary" type="submit" disabled={busy}>
          <Search size={17} />
          {busy ? "Searching…" : "Find location"}
        </button>
        {q.trim().length >= 2 && !coordinates && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void searchOnline()}
          >
            <Globe2 size={16} />
            Search online
          </button>
        )}
      </form>
      <div className="location-results">
        {results.map((p, i) => (
          <button key={`${p.id}-${i}`} onClick={() => choose(p)}>
            <MapPin size={14} />
            {p.name}
            {p.country ? `, ${p.country}` : ""}
          </button>
        ))}
      </div>
      {note && (
        <p className="note" role="status">
          {note}
        </p>
      )}
      <p className="note">
        Cached places work offline. Online search sends your query to{" "}
        <a
          href="https://open-meteo.com/en/docs/geocoding-api"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo / GeoNames
        </a>{" "}
        only when requested. Town-level results; no address lookup.
      </p>
    </section>
  );
}

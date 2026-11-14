import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowUpRight, Compass } from "lucide-react";
import { DESTINATIONS, GUIDE, searchText } from "../data/guide";
export default function NavigationSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const open = () => {
    dialog.current?.showModal();
    input.current?.focus();
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, []);
  const destinations = DESTINATIONS.filter((d) =>
    searchText(query, `${d.title} ${d.detail} ${d.tags}`),
  );
  const answers = query.trim()
    ? GUIDE.filter((d) =>
        searchText(query, `${d.title} ${d.tags} ${d.answer}`),
      ).slice(0, 4)
    : [];
  return (
    <>
      <button
        className="navigation-search"
        onClick={open}
        aria-label="Search pages and tools"
      >
        <Search size={18} />
        <span>Search</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-label="Search FieldShift"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="search-dialog-top">
          <Search size={22} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a page, crop, tool or answer…"
            aria-label="Search pages, crops and questions"
          />
          <button
            onClick={() => dialog.current?.close()}
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>
        <div className="search-results">
          <p className="eyebrow">
            <Compass size={14} />
            {query ? "MATCHING TOOLS" : "GO STRAIGHT TO"}
          </p>
          {destinations.map((d) => (
            <a
              key={d.route}
              href={`#${d.route}`}
              onClick={() => dialog.current?.close()}
            >
              <span>
                <strong>{d.title}</strong>
                <small>{d.detail}</small>
              </span>
              <ArrowUpRight size={18} />
            </a>
          ))}
          {answers.length > 0 && (
            <>
              <p className="eyebrow">FROM THE QUESTION GUIDE</p>
              {answers.map((d) => (
                <a
                  key={d.id}
                  href={`#/help?q=${encodeURIComponent(query)}`}
                  onClick={() => dialog.current?.close()}
                >
                  <span>
                    <strong>{d.title}</strong>
                    <small>{d.answer.slice(0, 110)}…</small>
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              ))}
            </>
          )}
          {!destinations.length && !answers.length && (
            <p>
              No match yet. Try “water”, “map”, “export” or open the{" "}
              <a href="#/help" onClick={() => dialog.current?.close()}>
                question helper
              </a>
              .
            </p>
          )}
        </div>
        <div className="search-dialog-footer">
          Tab to move · Enter to open · Esc to close
        </div>
      </dialog>
    </>
  );
}

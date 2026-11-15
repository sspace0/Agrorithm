import { useState } from "react";
import { Search, BookOpen, ArrowUpRight, MessageCircle, FlaskConical } from "lucide-react";
import { GUIDE, searchText } from "../data/guide";
export default function Help() {
  const [q, setQ] = useState(
    new URLSearchParams(location.hash.split("?")[1]).get("q") || "",
  );
  const results = GUIDE.filter((d) =>
    searchText(q, `${d.title} ${d.tags} ${d.answer}`),
  );
  return (
    <main className="standalone help-page">
      <span className="eyebrow">
        <MessageCircle size={17} /> THE FIELD GUIDE
      </span>
      <h1>
        A clearer answer.
        <br />
        <em>A better next step.</em>
      </h1>
      <p className="lede">
        Ask the guide by searching a topic or question. These are curated,
        source-linked explanations—not generated agronomic advice. No API key,
        login or paid service.
      </p>
      <section className="paper">
        <span className="eyebrow"><FlaskConical size={15}/> THE HISTORICAL PATTERN LAB</span>
        <h2>See what the weather model learned.</h2>
        <p>Explore four historical monthly patterns learned from the genuine NASA POWER cache, with training years, held-out months and source evidence visible.</p>
        <a className="text-action" href="#/weather-patterns"><FlaskConical size={17}/> Explore learned weather patterns <ArrowUpRight size={16}/></a>
      </section>
      <label className="guide-search">
        <Search size={22} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: water, satellite, rice, save…"
          aria-label="Search the question guide"
        />
      </label>
      <div className="guide-topics">
        {["Water", "Map", "Soil", "Rice", "Weather", "Offline"].map((t) => (
          <button
            key={t}
            onClick={() => setQ(t)}
            aria-pressed={q.toLowerCase() === t.toLowerCase()}
          >
            <BookOpen size={15} />
            {t}
          </button>
        ))}
        <button onClick={() => setQ("")}>
          <Search size={15} />
          All questions
        </button>
      </div>
      <p className="note" role="status">
        {results.length} matching {results.length === 1 ? "answer" : "answers"}{" "}
        · Project guide v1
      </p>
      <div className="guide-answers">
        {results.map((d) => (
          <article key={d.id}>
            <span className="eyebrow">
              <BookOpen size={15} /> EXPLAINED
            </span>
            <h2>{d.title}</h2>
            <p>{d.answer}</p>
            <div>
              <a className="text-action" href={`#${d.route}`}>
                {d.action}
                <ArrowUpRight size={16} />
              </a>
              <a
                className="guide-source"
                href={d.source.startsWith("/") ? `#${d.source}` : d.source}
                {...(!d.source.startsWith("/")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                Read the source <ArrowUpRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>
      {!results.length && (
        <div className="empty-guide">
          <h2>This guide cannot answer that yet.</h2>
          <p>
            Try a simpler topic, check the data sources, or take the question to
            a local agronomist. The guide does not invent an answer for
            unsupported questions.
          </p>
          <button onClick={() => setQ("")}>Show all questions</button>
        </div>
      )}
    </main>
  );
}

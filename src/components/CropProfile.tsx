import {
  CalendarDays,
  Thermometer,
  Droplets,
  FlaskConical,
  Sun,
  Flame,
  Clock3,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { PROFILES } from "../data/cropProfiles";
import { ATLAS_CROPS } from "../data/atlas";
export default function CropProfile({ crop }: { crop: string }) {
  const p = PROFILES[crop],
    name = ATLAS_CROPS.find((c) => c.id === crop)?.name;
  if (!p) return null;
  const fields = [
    { label: "Growth temperature", value: p.temperature, Icon: Thermometer },
    { label: "Planting season", value: p.planting, Icon: CalendarDays },
    { label: "Harvest season", value: p.harvest, Icon: Clock3 },
    { label: "Water requirement", value: p.water, Icon: Droplets },
    { label: "Soil pH", value: p.ph, Icon: FlaskConical },
    { label: "Drought response", value: p.drought, Icon: Sun },
    { label: "Heat response", value: p.heat, Icon: Flame },
  ];
  return (
    <section className="crop-profile" aria-label={`${name} growing reference`}>
      <div className="profile-heading">
        <div>
          <span className="eyebrow">
            <BookOpen size={16} /> CROP REFERENCE
          </span>
          <h2>{name}: growing conditions.</h2>
        </div>
        <span className="reference-status">
          Sourced guidance · local checks needed
        </span>
      </div>
      <p className="profile-applicability">{p.applicability}</p>
      <dl className="profile-facts">
        {fields.map(({ label, value, Icon }) => (
          <div key={label}>
            <dt>
              <Icon size={18} />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details className="profile-sources">
        <summary>Sources, applicability & missing evidence</summary>
        <ol>
          {p.sources.map((s, i) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                [{i + 1}] {s.title}
                <ArrowUpRight size={13} />
              </a>
            </li>
          ))}
        </ol>
        <ul>
          {p.provisional.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          These reference values do not silently replace the Punjab rotation
          engine’s parameter registry. Seasons are regional examples, not a
          global planting calendar. Water requirements are not a field
          irrigation prescription. Reviewed 14 November 2026.
        </p>
      </details>
    </section>
  );
}

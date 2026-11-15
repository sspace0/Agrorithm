import { AlertTriangle, CircleHelp, Droplets, Thermometer, FlaskConical, CheckCircle2, BookOpen } from "lucide-react";
import { ASSESSMENT_STATUS, type AssessmentCategory, type AssessmentRow, type InputAssessment as Assessment } from "../engine/inputAssessment";
import { formatNumber } from "../engine/format";
import "./input-assessment.css";

export function AssessmentRowCard({ row }: { row: AssessmentRow }) {
  const Icon = row.status === "unknown" ? CircleHelp : row.status === "within" ? CheckCircle2 : AlertTriangle;
  return (
    <article className={`input-assessment-row assessment-${row.status}`} data-assessment-id={row.id}>
      <div className="assessment-row-title">
        <div><h4>{row.label}</h4><p>{row.context}</p></div>
        <span className="assessment-status"><Icon size={16} aria-hidden="true" />{ASSESSMENT_STATUS[row.status]}</span>
      </div>
      <dl className="assessment-values">
        <div><dt>{row.inputLabel}</dt><dd>{formatNumber(row.value)}<small>{row.unit}</small></dd></div>
        <div><dt>{row.referenceLabel}</dt><dd>{row.referenceText}<small>{row.unit}</small></dd></div>
        <div><dt>Difference</dt><dd className="assessment-difference">{row.differenceText}</dd></div>
      </dl>
      <div className="assessment-bases"><span>{row.basis}</span><span>{row.referenceBasis}</span></div>
      <details><summary><BookOpen size={15} aria-hidden="true" />Interpretation & source</summary><p>{row.explanation}</p>{row.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</details>
    </article>
  );
}

const GROUPS = {
  water: { title: "Water estimate against your supply", Icon: Droplets },
  soil: { title: "Soil inputs against growth references", Icon: FlaskConical },
  temperature: { title: "Weather against exposure screens", Icon: Thermometer },
};

export default function InputAssessment({ assessment, groups = ["water", "soil", "temperature"], compact = false }: {
  assessment: Assessment;
  groups?: AssessmentCategory[];
  compact?: boolean;
}) {
  return (
    <section className={`input-assessment${compact ? " assessment-compact" : ""}`} aria-label="Inputs and comparable references">
      <div className="assessment-intro"><span className="eyebrow">INPUTS & REFERENCES</span><h2>Compare like with like.</h2><p>Matching units reveal the gap. Red identifies a modeled water-budget exceedance; amber calls for local review. Unknown evidence stays unclassified. General crop references are not verified local ideal values.</p></div>
      {groups.map((group) => {
        const { title, Icon } = GROUPS[group];
        if (!assessment[group].length) return null;
        return <section className="assessment-group" key={group}><h3><Icon size={20} aria-hidden="true" />{title}</h3><div className="assessment-group-rows">{assessment[group].map((row) => <AssessmentRowCard key={row.id} row={row} />)}</div></section>;
      })}
    </section>
  );
}

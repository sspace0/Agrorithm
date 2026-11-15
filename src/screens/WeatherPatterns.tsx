import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, CloudRain, Database, Download, FlaskConical, Info, RefreshCw, SlidersHorizontal, Snowflake, Sun, Thermometer, Wind } from "lucide-react";
import { asset } from "../config";
import { assignWeatherPattern, plainWeatherPattern, outsideTrainingRange, parseWeatherPatternModel, WEATHER_FEATURES, type WeatherFeatures, type WeatherPatternModel } from "../engine/weatherPatterns";
import "../weather-patterns.css";

const colors = ["#b6c6db", "#d1d5ad", "#9dc8ba", "#e2bd93"];
const icons = [Snowflake, Wind, CloudRain, Sun];
const featureLabels = ["Mean daily minimum", "Mean daily maximum", "Monthly precipitation", "Days below 1 mm rain"];
const units = ["°C", "°C", "mm/month", "% days"];
const number = (value: number, i: number) => `${(i === 3 ? value * 100 : value).toFixed(i === 3 ? 0 : 1)} ${units[i]}`;
const monthName = (month: string) => new Intl.DateTimeFormat("en", {month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-15T12:00:00Z`));

export default function WeatherPatterns() {
  const [model, setModel] = useState<WeatherPatternModel | null>(null), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    fetch(asset("data/weather-patterns.json"), {signal:abort.signal}).then(response=>{
      if (!response.ok) throw Error("The cached model could not be loaded.");
      return response.json();
    }).then(value=>setModel(parseWeatherPatternModel(value))).catch(reason=>{
      if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : "The cached model could not be loaded.");
    });
    return ()=>abort.abort();
  },[retry]);
  return <main className="standalone weather-patterns-page">
    <a className="text-action" href="#/"><ArrowLeft size={16}/> Home</a>
    <span className="eyebrow"><FlaskConical size={16}/> THE HISTORICAL PATTERN LAB</span>
    <h1>Learn from<br/><em>the seasons.</em></h1>
    <p className="lede">A small machine learning model trained on genuine NASA POWER observations groups similar historical months. Explore what it learned, what was held out, and where its evidence ends.</p>
    <div className="weather-scope"><Info size={18}/><p>Descriptive historical clustering. This is not a forecast, a crop suitability model, a drought classification, or a conversational language model. Your rotation calculations remain separate.</p></div>
    {error ? <section className="paper weather-model-empty" role="alert"><h2>The learned record is unavailable.</h2><p>{error} The field planner and source guide remain available.</p><button className="secondary" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={16}/> Try again</button><a className="text-action" href="#/help"><BookOpen size={16}/> Open the field guide</a></section>
      : model ? <PatternExplorer model={model}/> : <section className="paper weather-model-empty" role="status"><Database size={24}/><h2>Loading the learned record…</h2><p>The small model and monthly observations are bundled with the site. No API key or online inference service is used.</p><div className="weather-model-skeleton"/></section>}
  </main>;
}

function PatternExplorer({model}:{model:WeatherPatternModel}) {
  const months = useMemo(()=>[...model.observations].sort((a,b)=>a.month.localeCompare(b.month)),[model]);
  const [selectedMonth, setSelectedMonth] = useState(months.at(-1)!.month), [custom, setCustom] = useState(false);
  const selected = months.find(row=>row.month===selectedMonth) || months[0];
  const assignment = assignWeatherPattern(model,selected.features)!;
  const index = model.clusters.findIndex(c=>c.id===assignment.nearest.cluster.id);
  const years = [...new Set(months.map(row=>row.month.slice(0,4)))];
  return <>
    <section className="weather-training-strip" aria-label="Training scope">
      <div><Database size={19}/><span>Verified daily rows<strong>{model.aggregation.inputDailyRows.toLocaleString()}</strong><small>2018–2024 · UTC</small></span></div>
      <div><CalendarDays size={19}/><span>Training months<strong>{model.trainingMetrics.months}</strong><small>January 2018–December 2022</small></span></div>
      <div><FlaskConical size={19}/><span>Held-out months<strong>{model.heldoutMetrics.months}</strong><small>January 2023–December 2024</small></span></div>
      <div><CloudRain size={19}/><span>Regional support<strong>{model.scope.latitude}° N · {model.scope.longitude}° E</strong><small>MERRA-2 meteorology grid ~0.5° × 0.63°</small></span></div>
    </section>
    <section className="paper weather-calendar-section">
      <div className="weather-section-heading"><div><span className="eyebrow"><CalendarDays size={15}/> 01 / THE OBSERVED RECORD</span><h2>Every month has a pattern.</h2></div><p>Select a month to inspect its actual features and learned membership. Colors describe the nearest historical center, not good or bad farming conditions.</p></div>
      <div className="weather-pattern-key" aria-label="Learned pattern key">{model.clusters.map((cluster,i)=>{const Icon=icons[i];return <button key={cluster.id} onClick={()=>{setSelectedMonth(cluster.representativeTrainingMonth);setCustom(false);}} style={{"--pattern":colors[i]} as CSSProperties} aria-pressed={index===i}><Icon size={19}/><span>{plainWeatherPattern(cluster.id,cluster.label)}<small>{cluster.trainingMonths} training months · {cluster.heldoutMonths} held out</small></span><ArrowRight size={16}/></button>;})}</div>
      <div className="weather-calendar" aria-label="Historical monthly assignments">{years.map(year=><div className={`weather-calendar-year ${year>="2023"?"weather-heldout-year":""}`} key={year}><strong>{year}<small>{year>="2023"?"held out":"training"}</small></strong>{months.filter(row=>row.month.startsWith(year)).map(row=>{const ci=model.clusters.findIndex(c=>c.id===row.clusterId), label=new Intl.DateTimeFormat("en",{month:"short",timeZone:"UTC"}).format(new Date(`${row.month}-15T12:00:00Z`));return <button key={row.month} aria-label={`${monthName(row.month)} · ${model.clusters[ci].label} · ${row.split==="heldout"?"held out":"training"}`} aria-pressed={selected.month===row.month} style={{"--pattern":colors[ci]} as CSSProperties} onClick={()=>{setSelectedMonth(row.month);setCustom(false);}}><span aria-hidden="true" className="weather-month-dot"/>{label}</button>;})}</div>)}</div>
      <p className="note">All {model.aggregation.acceptedMonths} displayed months contain every calendar day with valid Tmin, Tmax and precipitation. Incomplete months are excluded without imputation. The darker year divider marks the chronological holdout.</p>
    </section>
    <section className="weather-month-inspector paper" aria-live="polite">
      <div className="weather-section-heading"><div><span className="eyebrow"><Thermometer size={15}/> 02 / INSPECT THE EVIDENCE</span><h2>{monthName(selected.month)}</h2><span className={`weather-split-badge ${selected.split==="heldout"?"is-heldout":""}`}>{selected.split==="heldout"?"Held out of fitting":"Used for training"} · {selected.completeDays}/{selected.expectedDays} complete days</span></div><label className="weather-month-select"><CalendarDays size={16}/><span>Jump to month<select value={selected.month} aria-label="Historical month" onChange={e=>{setSelectedMonth(e.target.value);setCustom(false);}}>{months.map(row=><option key={row.month} value={row.month}>{monthName(row.month)} · {row.split==="heldout"?"held out":"training"}</option>)}</select></span></label></div>
      <div className="weather-assignment" style={{"--pattern":colors[index]} as CSSProperties}><div className="weather-assignment-symbol">{(() => {const Icon=icons[index];return <Icon size={34}/>;})()}</div><div><span className="eyebrow">MODELED NEAREST-CENTER ASSIGNMENT</span><h3>{plainWeatherPattern(assignment.nearest.cluster.id,assignment.nearest.cluster.label)}</h3><p>Distance {assignment.nearest.distance.toFixed(2)} in standardized feature space. A smaller distance indicates a closer historical match; it is not confidence or a success probability.</p></div></div>
      <div className="table-scroll"><table className="weather-feature-table"><caption>Monthly observations compared with the nearest learned center</caption><thead><tr><th>Feature</th><th>This historical month</th><th>Learned center</th></tr></thead><tbody>{WEATHER_FEATURES.map((key,i)=><tr key={key}><th>{featureLabels[i]}</th><td>{number(selected.features[key],i)}</td><td>{number(assignment.nearest.cluster.center[key],i)}</td></tr>)}</tbody></table></div>
      <div className="weather-neighbor-distances"><h3>Compare all four learned patterns</h3><p className="note">The same four standardized features enter every distance. These bars are distances, not probabilities.</p>{assignment.distances.map(row=>{const ci=model.clusters.findIndex(c=>c.id===row.cluster.id);return <div className="weather-distance-row" key={row.cluster.id}><span><i style={{background:colors[ci]}}/>{plainWeatherPattern(row.cluster.id,row.cluster.label)}</span><div aria-hidden="true"><i style={{width:`${row.distance/Math.max(...assignment.distances.map(d=>d.distance),1)*100}%`,background:colors[ci]}}/></div><strong>{row.distance.toFixed(2)}</strong></div>;})}</div>
      <button className="secondary" aria-expanded={custom} onClick={()=>setCustom(!custom)}><SlidersHorizontal size={17}/>{custom?"Close custom comparison":"Compare custom monthly conditions"}</button>
      {custom && <CustomComparison key={selected.month} model={model} initial={selected.features}/>}
    </section>
    <section className="paper weather-methods"><span className="eyebrow"><BookOpen size={15}/> 03 / HOW IT LEARNED</span><h2>Small model. Explicit limits.</h2><div className="weather-method-grid"><article><h3>Fit on the earlier years.</h3><p>Four k-means centers were fitted using monthly Tmin, Tmax, precipitation total and dry-day fraction. Scaling, initialization selection, center names and all fitted parameters use the 60 training months only. The remaining 24 months are assigned afterward.</p><p>The dry-day threshold is precipitation below 1 mm/day. It is a descriptive feature, not an agronomic drought threshold. Monthly rainfall also depends partly on month length.</p></article><article><h3>Check an honest holdout.</h3><dl className="weather-model-metrics"><div><dt>Training quantization RMSE</dt><dd>{model.trainingMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}</dd></div><div><dt>Held-out quantization RMSE</dt><dd>{model.heldoutMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}</dd></div></dl><p>Errors measure distance from learned centers. They do not measure forecasting accuracy. Seven years at one regional point, correlated features and strong seasonality limit what these patterns can establish.</p></article></div><details><summary>Model details, limitations and provenance</summary><p>{model.fit.algorithm} · {model.fit.k} clusters · {model.fit.restarts} deterministic restarts · seed {model.fit.seed}. Model {model.modelVersion}. NASA POWER API {model.provenance.apiVersion}.</p><p>{model.scope.spatialInterpretation} {model.scope.timeStandard} record {model.scope.period.join(" through ")}.</p><ul>{model.limitations.map(limit=><li key={limit}>{limit}</li>)}</ul><p className="note weather-source-hash">Processed source SHA-256: {model.provenance.sourceSha256}</p><p>Training preprocessing verified each raw yearly response checksum and its daily values against the processed cache. No farm inputs, crop yields or private plans were used.</p><ul>{model.provenance.rawYearlyResponses.map(source=><li key={source.file}><a href={source.url} target="_blank" rel="noreferrer">NASA POWER {source.file.replace("power-","").replace(".json","")}</a> · cached {source.retrieved}</li>)}</ul></details><div className="weather-method-links"><a className="secondary" href={asset("data/weather-patterns.json")} download><Download size={17}/> Download model and observations</a><a className="text-action" href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer"><Database size={16}/> NASA POWER documentation</a><a className="text-action" href="#/studio/evidence"><ArrowRight size={16}/> Open the farm evidence</a></div></section>
  </>;
}

function CustomComparison({model,initial}:{model:WeatherPatternModel;initial:WeatherFeatures}) {
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(WEATHER_FEATURES.map(key=>[key,initial[key].toFixed(key==="dryDayFraction"?3:2)])));
  const features=Object.fromEntries(WEATHER_FEATURES.map(key=>[key,values[key].trim()===""?undefined:Number(values[key])])) as Partial<WeatherFeatures>;
  const result=assignWeatherPattern(model,features);
  const outside=outsideTrainingRange(model,features);
  return <section className="weather-custom"><h3><SlidersHorizontal size={18}/> A hypothetical monthly comparison</h3><p>Edit all four features to find the nearest learned historical pattern. This does not add observations, refit the model, or predict a future month. The model was trained only for the stated Punjab regional point.</p><div className="weather-custom-inputs">{WEATHER_FEATURES.map((key,i)=><label key={key}>{i<2?<Thermometer size={16}/>:i===2?<CloudRain size={16}/>:<Sun size={16}/>}<span>{featureLabels[i]} · {i===3?"fraction 0–1":units[i]}<input type="number" step={i===3?"0.01":"0.1"} min={i>=2?0:undefined} max={i===3?1:undefined} value={values[key]} aria-label={`Custom ${featureLabels[i]}`} onChange={e=>setValues({...values,[key]:e.target.value})}/></span></label>)}</div><div className="weather-custom-result" role="status">{result?<><strong>{plainWeatherPattern(result.nearest.cluster.id,result.nearest.cluster.label)}</strong><span>Standardized distance {result.nearest.distance.toFixed(2)} · hypothetical input</span>{outside.length>0&&<span className="weather-extrapolation">Outside the training feature range: {outside.map(key=>featureLabels[WEATHER_FEATURES.indexOf(key)]).join(", ")}. This nearest-center comparison may be uninformative.</span>}</>:<><strong>Comparison unresolved.</strong><span>Supply every finite feature, nonnegative rainfall, a dry-day fraction between 0 and 1, and minimum temperature no greater than maximum.</span></>}</div></section>;
}

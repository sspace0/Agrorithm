import { GUIDE } from "../data/guide";
import { assignWeatherPattern, type WeatherPatternModel } from "./weatherPatterns";

export interface HelperAnswer { kind: "welcome" | "learned-pattern" | "source-guide" | "model-details" | "clarification" | "scope" | "model-required" | "unavailable"; title: string; text: string; facts?: string[]; links: { label: string; href: string }[]; }
const monthTokens = ["jan(?:uary)?","feb(?:ruary)?","mar(?:ch)?","apr(?:il)?","may","jun(?:e)?","jul(?:y)?","aug(?:ust)?","sep(?:t(?:ember)?)?","oct(?:ober)?","nov(?:ember)?","dec(?:ember)?"];
export function historicalMonthFromQuestion(query: string) {
  const dates = new Set<string>();
  for (const match of query.matchAll(/\b((?:19|20|21)\d{2})[-/](0[1-9]|1[0-2])\b/g)) dates.add(`${match[1]}-${match[2]}`);
  const years = [...new Set(query.match(/\b(?:19|20|21)\d{2}\b/g) || [])];
  const months = monthTokens.flatMap((token, i)=>new RegExp(`\\b${token}\\.?\\b`,"i").test(query)?[i+1]:[]);
  if (months.length===1 && years.length===1) dates.add(`${years[0]}-${String(months[0]).padStart(2,"0")}`);
  if (dates.size>1 || months.length>1 || years.length>1) return { month:null, ambiguous:true, needsDate:false };
  return { month:[...dates][0] || null, ambiguous:false, needsDate:(months.length>0||years.length>0)&&dates.size===0 };
}
const modelLinks = [{label:"Explore learned weather patterns",href:"#/weather-patterns"},{label:"NASA POWER source",href:"https://power.larc.nasa.gov/docs/services/api/temporal/daily/"}];
export const HELPER_WELCOME: HelperAnswer = {kind:"welcome",title:"A clearer next step.",text:"Ask about a historical month, the model, or a farming-data topic. I use the learned NASA weather patterns and the project's documented source guide. Questions stay in this browser session.",links:[{label:"Open the pattern lab",href:"#/weather-patterns"},{label:"Browse the field guide",href:"#/help"}]};
const scopeQuestion = /\b(forecast|predict(?:ion|ions)?|future|tomorrow|profit|yield|guarantee|guaranteed)\b|\bbest crop\b|\bwhich crop\b|\bwhat (?:crop|should i plant)\b|\b(?:carbon|nitrogen) (?:gain|increase|credit)\b|\b(?:my|field|farm)(?:'s)? water.table depth\b/i;
const stop = new Set("a an the is are was were i my me you your can could would should how what where when why do does did to of for and or please tell about this that it much mean means explain".split(" "));

export function answerAgrorithmQuestion(question: string, model: WeatherPatternModel | null): HelperAnswer {
  const query=question.trim();
  if (!query || /^(hello|hi|hey|help)[!. ]*$/i.test(query)) return HELPER_WELCOME;
  if (scopeQuestion.test(query)) return {kind:"scope",title:"That needs evidence this helper cannot supply.",text:"The learned model groups supplied historical weather months. It cannot forecast, choose the best crop, estimate future yield or profit, or establish a field's groundwater depth. Use the transparent planning tools and local evidence for those decisions.",links:[{label:"Review observations and gaps",href:"#/studio/evidence"},{label:"Explore hypothetical stress tests",href:"#/studio/scenarios"},...modelLinks]};
  if (/\b(train(?:ed|ing)?|learn(?:ed|ing)?|k.?means|cluster(?:s|ing)?|model)\b/i.test(query) && !historicalMonthFromQuestion(query).month && !/\b(soil|water.table|groundwater|roots)\b/i.test(query)) {
    if (!model) return {kind:"model-required",title:"Open the learned record.",text:"The bundled NASA weather model is needed for this answer.",links:modelLinks};
    return {kind:"model-details",title:"A small model with an explicit holdout.",text:`Four k-means patterns were fitted to ${model.trainingMetrics.months} complete months from 2018–2022 at ${model.scope.latitude.toFixed(2)}° N, ${model.scope.longitude.toFixed(2)}° E. The remaining ${model.heldoutMetrics.months} months from 2023–2024 were held out of scaling, centers and run selection.`,facts:["Features: mean daily Tmin, mean daily Tmax, monthly precipitation and fraction of days below 1 mm rainfall.",`Quantization RMSE: training ${model.trainingMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}; held out ${model.heldoutMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}. These distances are not predictive accuracy or probabilities.`,"This is a descriptive historical pattern model paired with a documented question guide, not a generative language model or crop advisor."],links:modelLinks};
  }
  const date=historicalMonthFromQuestion(query);
  if (date.ambiguous) return {kind:"clarification",title:"Choose one month and year.",text:"Compare one historical month at a time, for example July 2023. The pattern lab lets you inspect the full 2018–2024 record.",links:modelLinks};
  if (date.month) {
    if (!model) return {kind:"model-required",title:"Open the learned record.",text:"The bundled NASA weather model is needed for this historical-month answer.",links:modelLinks};
    const row=model.observations.find(r=>r.month===date.month);
    if (!row) return {kind:"unavailable",title:"That month is outside the learned record.",text:"The bundled model contains complete observed months from January 2018 through December 2024. I cannot invent newer observations or extrapolate a future month.",links:modelLinks};
    const assignment=assignWeatherPattern(model,row.features);
    if (!assignment) return {kind:"unavailable",title:"This comparison is unresolved.",text:"All four valid features are required. Missing evidence cannot be treated as a closer historical match.",links:modelLinks};
    const label=new Intl.DateTimeFormat("en",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${row.month}-15T12:00:00Z`));
    return {kind:"learned-pattern",title:`${label} · ${assignment.nearest.cluster.label}`,text:`This complete NASA POWER month was ${row.split==="heldout"?"held out of fitting":"used in training"}. Its nearest learned center is a descriptive assignment for the Punjab regional point, not a crop recommendation.`,facts:[`Mean daily minimum ${row.features.meanTminC.toFixed(2)} °C; mean daily maximum ${row.features.meanTmaxC.toFixed(2)} °C.`,`Monthly precipitation ${row.features.totalRainMm.toFixed(2)} mm; ${(100*row.features.dryDayFraction).toFixed(2)}% of days had less than 1 mm rainfall.`,`Coverage ${row.completeDays}/${row.expectedDays} complete days. Standardized distance ${assignment.nearest.distance.toFixed(2)}; not a confidence score.`,"Regional MERRA-2/POWER meteorology (~0.5° × 0.63° grid), not a field sensor. Model power-monthly-kmeans-1.0.0."],links:modelLinks};
  }
  if (date.needsDate && /\b(weather|rain|temperature|month|pattern|nasa)\b/i.test(query)) return {kind:"clarification",title:"Which historical month and year?",text:"Try “What was July 2023 like?” I can compare complete months in the bundled 2018–2024 record.",links:modelLinks};
  const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])].filter(word=>word.length>2&&!stop.has(word));
  const ranked=GUIDE.map(entry=>{const title=new Set(entry.title.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]),tags=new Set(entry.tags.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);const phraseBonus=entry.id==="soil"&&/\b(groundwater|water.table|smap|grace|roots)\b/i.test(query)?10:entry.id==="rice"&&/\brice\b/i.test(query)?10:entry.id==="ndvi"&&/\bndvi\b/i.test(query)?10:0;return {entry,score:phraseBonus+terms.reduce((sum,term)=>sum+(title.has(term)?3:0)+(tags.has(term)?2:0),0)};}).sort((a,b)=>b.score-a.score);
  if (ranked[0]?.score>0) {
    const entry=ranked[0].entry;
    return {kind:"source-guide",title:entry.title,text:entry.answer,links:[{label:entry.action,href:`#${entry.route}`},{label:"Read the cited source",href:entry.source.startsWith("/")?`#${entry.source}`:entry.source}]};
  }
  return {kind:"unavailable",title:"I cannot establish that from this record.",text:"Try a historical month and year, or a documented topic such as water accounting, satellite observations, soil layers or saving a plan. For unsupported agronomic advice, take the question to a local agronomist.",links:[{label:"Browse documented questions",href:"#/help"},{label:"Inspect sources and limits",href:"#/sources"}]};
}

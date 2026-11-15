import { GUIDE } from "../data/guide";
import { PROFILES, type CropProfile } from "../data/cropProfiles";
import { ATLAS_CROPS } from "../data/atlas";
import { assignWeatherPattern, plainWeatherPattern, type WeatherPatternModel } from "./weatherPatterns";
import { answerPlanQuestion, type HelperPlanContext } from "./helperPlanContext";

export interface HelperContext { month?: string; topicIds?: string[]; cropIds?: string[]; plan?: HelperPlanContext; }
export interface HelperSection { title: string; text: string; links: { label: string; href: string }[]; }
export interface HelperAnswer { kind: "welcome" | "learned-pattern" | "source-guide" | "plan-results" | "model-details" | "clarification" | "scope" | "model-required" | "unavailable"; title: string; text: string; facts?: string[]; sections?: HelperSection[]; context?: HelperContext; links: { label: string; href: string }[]; }
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
const modelLinks = [{label:"Explore learned weather patterns",href:"#/weather-patterns"},{label:"NASA POWER source",href:"https://power.larc.nasa.gov/docs/services/api/temporal/daily/"},{label:"See this in the Rotation lab",href:"#/studio/lab"}];
export const HELPER_WELCOME: HelperAnswer = {kind:"welcome",title:"A clearer next step.",text:"Ask about a historical month, the model, or a farming-data topic. I use the learned NASA weather patterns and the project's documented source guide. Questions stay in this browser session.",links:[{label:"Open the pattern lab",href:"#/weather-patterns"},{label:"Browse the field guide",href:"#/help"}]};
const scopeQuestion = /\b(forecast|predict(?:ion|ions)?|future|tomorrow|profit|yield|guarantee|guaranteed)\b|\bbest crop\b|\bwhich crop\b|\bwhat (?:crop|should i plant)\b|\b(?:carbon|nitrogen) (?:gain|increase|credit)\b|\b(?:my|field|farm)(?:'s)? water.table depth\b/i;
const stop = new Set("a an the is are was were i my me you your can could would should how what where when why do does did to of for and or please tell about this that it much mean means explain".split(" "));
const monthLabel = (month: string) => new Intl.DateTimeFormat("en",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-15T12:00:00Z`));
const guideLinks = (entry: typeof GUIDE[number]) => [{label:entry.action,href:`#${entry.route}`},{label:"See this in the Rotation lab",href:"#/studio/lab"},{label:`Source: ${entry.title}`,href:entry.source.startsWith("/")?`#${entry.source}`:entry.source}];
const topicPatterns: Record<string, RegExp> = {
  start:/\b(start|begin|setup)\b/i, map:/\b(map|atlas|coordinates|location|blue marble)\b/i,
  water:/\b(irrigation|water accounting|water budget|evapotranspiration|ET|millimetre|volume)\b/i,
  rice:/\b(rice|paddy|seepage|ponding)\b/i, weather:/\b(weather|POWER|rainfall|temperature|climate)\b/i,
  ndvi:/\b(NDVI|HLS|vegetation|satellite observations|residue)\b/i,
  soil:/\b(soil|groundwater|water.table|SMAP|GRACE|roots|aquifer)\b/i,
  choices:/\b(infeasible|unresolved|constraints|equipment|markets|buffers)\b/i,
  rank:/\b(ranking|scores?|weights|pareto|sensitivity)\b/i,
  offline:/\b(offline|save|saving|export|privacy|phone|WebGL|PDF|CSV)\b/i,
};
const cropAliases: Record<string,RegExp> = {maize:/\b(maize|corn)\b/i,wheat:/\bwheat\b/i,mung:/\b(mung(?:bean)?|green gram)\b/i,chickpea:/\b(chickpeas?|chana|bengal gram)\b/i,tomato:/\btomato(?:es)?\b/i,potato:/\bpotato(?:es)?\b/i,citrus:/\b(citrus|oranges?|kinnow)\b/i,mango:/\bmango(?:es)?\b/i};
const traits: {key: keyof Pick<CropProfile,"temperature"|"planting"|"harvest"|"water"|"ph"|"drought"|"heat">;label:string;pattern:RegExp}[] = [
  {key:"temperature",label:"Temperature",pattern:/\b(temperature|climate|grow(?:ing)?)\b/i},
  {key:"planting",label:"Planting",pattern:/\b(sow(?:ing)?|plant(?:ing)?|calendar)\b/i},
  {key:"harvest",label:"Harvest",pattern:/\b(harvest|maturity)\b/i},
  {key:"water",label:"Water",pattern:/\b(water|irrigation|ET)\b/i},
  {key:"ph",label:"Soil pH",pattern:/\b(pH|acidity|alkaline)\b/i},
  {key:"drought",label:"Drought",pattern:/\b(drought|dry)\b/i},
  {key:"heat",label:"Heat",pattern:/\b(heat|hot)\b/i},
];
const methodQuestion=/\b(?:water|irrigation) (?:method|system)|\b(drip|sprinkler|furrow)\b/i;
function cropSections(query: string, context: HelperContext) {
  const requested=traits.filter(trait=>trait.pattern.test(query));
  let crops=ATLAS_CROPS.filter(crop=>cropAliases[crop.id]?.test(query));
  if(!crops.length&&requested.length&&/\b(what about|and|its|their|that|more)\b/i.test(query))crops=ATLAS_CROPS.filter(crop=>context.cropIds?.includes(crop.id));
  const selected=requested.length?requested:traits.filter(trait=>["temperature","water","planting"].includes(trait.key));
  const sections: HelperSection[]=crops.slice(0,3).map(crop=>{
    const profile=PROFILES[crop.id];
    return {title:`${crop.name} · reference traits`,text:selected.map(trait=>`${trait.label}: ${profile[trait.key]}`).concat(`Applies to: ${profile.applicability}`,`Limits: ${profile.provisional.join(" ")}`).join("\n\n"),links:profile.sources.map((source,i)=>({label:`[${i+1}] ${source.title}`,href:source.url}))};
  });
  if(methodQuestion.test(query))sections.push({title:`${crops.length===1?`${crops[0].name}: `:""}choosing an irrigation method`,text:"There is no universal best method from the information supplied. Drip is worth considering for tomato and other row vegetables when the budget, suitable pressure, filtration and regular emitter maintenance are available. FAO describes drip for row vegetables and warns about emitter blockage and installation cost. Check soil wetting, water quality, supply reliability and maintenance capacity with a local irrigation specialist before choosing a system.\n\nCompare feasible drip, surface and sprinkler designs for your field. NASA’s coarse weather grid and a crop ET range cannot select the best method or set an irrigation schedule. Drip does not reduce the crop’s ET requirement; any savings depend on reducing application losses and on operation.",links:[{label:"FAO: drip suitability, filtration and operation",href:"https://www.fao.org/4/s8684e/s8684e07.htm"}]});
  return {sections,cropIds:crops.map(crop=>crop.id)};
}

function sourceAnswer(query: string, context: HelperContext): HelperAnswer | null {
  let entries=GUIDE.filter(entry=>topicPatterns[entry.id]?.test(query)).slice(0,3);
  const followup=/^(?:and )?(?:why|tell me more|explain more|more details|what does that mean|explain that|how does that work)[?!. ]*$/i.test(query);
  if (!entries.length&&followup) entries=GUIDE.filter(entry=>context.topicIds?.includes(entry.id));
  const crop=cropSections(query,context);
  if (!entries.length&&!crop.sections.length) {
    const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])].filter(word=>word.length>2&&!stop.has(word));
    const ranked=GUIDE.map(entry=>({entry,score:terms.reduce((sum,term)=>sum+(entry.title.toLowerCase().split(/\W+/).includes(term)?3:0)+(entry.tags.toLowerCase().split(/\W+/).includes(term)?2:0),0)})).sort((a,b)=>b.score-a.score);
    if(ranked[0]?.score>=2) entries=[ranked[0].entry];
  }
  if (!entries.length&&!crop.sections.length) return null;
  const sections=[...entries.map(entry=>({title:entry.title,text:entry.answer,links:guideLinks(entry)})),...crop.sections];
  return {kind:"source-guide",title:sections.length>1?"Let’s take those topics in turn.":sections[0].title,text:sections.length>1?"Here are the documented explanations for the parts of your question covered by this guide. Crop references describe general traits; they do not establish the best crop or method for your field.":sections[0].text,sections:sections.length>1?sections:undefined,context:{...context,topicIds:entries.map(entry=>entry.id),cropIds:crop.cropIds.length?crop.cropIds:context.cropIds},links:sections.length>1?[]:sections[0].links};
}

export function answerAgrorithmQuestion(question: string, model: WeatherPatternModel | null, context: HelperContext = {}): HelperAnswer {
  const query=question.trim();
  if (!query || /^help[!. ]*$/i.test(query)) return HELPER_WELCOME;
  if (/^(?:(?:hello|hi|hey)(?: there)?[!., ]*|(?:(?:hello|hi|hey)[!., ]*)?how (?:are|r) (?:you|u)(?: doing)?[?!. ]*|(?:thanks|thank you)[!. ]*)$/i.test(query)) return {...HELPER_WELCOME,title:"Hi. Ready when you are.",text:"Hi! I can help you read NASA observations, explore crop references and understand your plan. Ask about a historical month, water accounting, satellite evidence or your results."};
  if (scopeQuestion.test(query)) return {kind:"scope",title:"That needs evidence this helper cannot supply.",text:"The learned model groups supplied historical weather months. It cannot forecast, choose the best crop, estimate future yield or profit, or establish a field's groundwater depth. Use the transparent planning tools and local evidence for those decisions.",links:[{label:"Review observations and gaps",href:"#/studio/evidence"},{label:"Explore hypothetical stress tests",href:"#/studio/scenarios"},...modelLinks]};
  const plan = answerPlanQuestion(query, context.plan);
  if (plan) return { ...plan, context };
  if (/\b(train(?:ed|ing)?|learn(?:ed|ing)?|k.?means|cluster(?:s|ing)?|model)\b/i.test(query) && !historicalMonthFromQuestion(query).month && !/\b(soil|water.table|groundwater|roots|irrigation|NDVI|offline)\b/i.test(query)) {
    if (!model) return {kind:"model-required",title:"Open the learned record.",text:"The bundled NASA weather model is needed for this answer.",links:modelLinks};
    return {kind:"model-details",title:"A small model with an explicit holdout.",text:`Four k-means patterns were fitted to ${model.trainingMetrics.months} complete months from 2018–2022 at ${model.scope.latitude.toFixed(2)}° N, ${model.scope.longitude.toFixed(2)}° E. The remaining ${model.heldoutMetrics.months} months from 2023–2024 were held out of scaling, centers and run selection.`,facts:["Features: mean daily Tmin, mean daily Tmax, monthly precipitation and fraction of days below 1 mm rainfall.",`Quantization RMSE: training ${model.trainingMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}; held out ${model.heldoutMetrics.rootMeanSquaredStandardizedDistance.toFixed(2)}. These distances are not predictive accuracy or probabilities.`,"This is a descriptive historical pattern model paired with a documented question guide, not a generative language model or crop advisor."],links:modelLinks};
  }
  const date=historicalMonthFromQuestion(query);
  let assumedYear=false;
  if (!date.ambiguous && date.needsDate && context.month && !/\b(?:19|20|21)\d{2}\b/.test(query)) {
    const month=monthTokens.findIndex(token=>new RegExp(`\\b${token}\\.?\\b`,"i").test(query));
    if(month>=0){date.month=`${context.month.slice(0,4)}-${String(month+1).padStart(2,"0")}`;date.needsDate=false;assumedYear=true;}
  }
  const lastYear=/\b(?:last|previous) year\b/i.test(query);
  if(lastYear&&!date.month&&context.month)date.month=context.month;
  if(lastYear&&!date.month)return {kind:"clarification",title:"Which month and year should I compare?",text:"Name the anchor month, for example July 2023. I can then compare its observed values with July 2022.",links:modelLinks};
  if (date.ambiguous) return {kind:"clarification",title:"Choose one month and year.",text:"Compare one historical month at a time, for example July 2023. The pattern lab lets you inspect the full 2018–2024 record.",links:modelLinks};
  if (date.month) {
    if (!model) return {kind:"model-required",title:"Open the learned record.",text:"The bundled NASA weather model is needed for this historical-month answer.",links:modelLinks};
    const row=model.observations.find(r=>r.month===date.month);
    if (!row) return {kind:"unavailable",title:"That month is outside the learned record.",text:"The bundled model contains complete observed months from January 2018 through December 2024. I cannot invent newer observations or extrapolate a future month.",links:modelLinks};
    if(lastYear){
      const priorMonth=`${Number(row.month.slice(0,4))-1}${row.month.slice(4)}`;
      const prior=model.observations.find(r=>r.month===priorMonth);
      if(!prior)return {kind:"unavailable",title:"The previous year is outside this record.",text:`${monthLabel(row.month)} is available, but ${monthLabel(priorMonth)} is not. The bundled observations cover 2018–2024.`,links:modelLinks};
      const fields=[{key:"meanTminC",label:"Mean daily minimum",unit:"°C",scale:1},{key:"meanTmaxC",label:"Mean daily maximum",unit:"°C",scale:1},{key:"totalRainMm",label:"Monthly precipitation",unit:"mm",scale:1},{key:"dryDayFraction",label:"Days below 1 mm rainfall",unit:"%",scale:100}] as const;
      return {kind:"learned-pattern",title:`${monthLabel(row.month)} compared with ${monthLabel(prior.month)}`,text:`These are actual observed historical months at the same NASA POWER regional point. Changes are ${monthLabel(row.month)} minus ${monthLabel(prior.month)}; dry-day change is in percentage points. This comparison cannot forecast future weather.`,facts:fields.map(({key,label,unit,scale})=>`${label}: ${(row.features[key]*scale).toFixed(2)} ${unit} versus ${(prior.features[key]*scale).toFixed(2)} ${unit}; change ${((row.features[key]-prior.features[key])*scale).toFixed(2)} ${key==="dryDayFraction"?"percentage points":unit}.`).concat(`Coverage: ${row.completeDays}/${row.expectedDays} and ${prior.completeDays}/${prior.expectedDays} complete days. ${row.split==="heldout"?"The anchor month was held out of fitting.":"The anchor month was used in training."}`),context:{...context,month:row.month},links:modelLinks};
    }
    const assignment=assignWeatherPattern(model,row.features);
    if (!assignment) return {kind:"unavailable",title:"This comparison is unresolved.",text:"All four valid features are required. Missing evidence cannot be treated as a closer historical match.",links:modelLinks};
    const label=monthLabel(row.month);
    const guide=sourceAnswer(query,{});
    return {kind:"learned-pattern",title:`${label} · ${plainWeatherPattern(assignment.nearest.cluster.id, assignment.nearest.cluster.label)}`,text:`${assumedYear?`Assuming ${row.month.slice(0,4)} from the previous month you asked about. `:""}This complete NASA POWER month was ${row.split==="heldout"?"held out of fitting":"used in training"}. Its nearest learned center is a descriptive assignment for the Punjab regional point, not a crop recommendation.`,facts:[`Mean daily minimum ${row.features.meanTminC.toFixed(2)} °C; mean daily maximum ${row.features.meanTmaxC.toFixed(2)} °C.`,`Monthly precipitation ${row.features.totalRainMm.toFixed(2)} mm; ${(100*row.features.dryDayFraction).toFixed(2)}% of days had less than 1 mm rainfall.`,`Coverage ${row.completeDays}/${row.expectedDays} complete days. Standardized distance ${assignment.nearest.distance.toFixed(2)}; not a confidence score.`,"Regional MERRA-2/POWER meteorology (~0.5° × 0.63° grid), not a field sensor. Model power-monthly-kmeans-1.0.0."],sections:guide?.sections,context:{...context,month:row.month},links:modelLinks};
  }
  if (date.needsDate) return {kind:"clarification",title:"Which historical month and year?",text:"Try “What was July 2023 like?” I can compare complete months in the bundled 2018–2024 record.",links:modelLinks};
  const guide=sourceAnswer(query,context);
  if(guide)return guide;
  return {kind:"unavailable",title:"I cannot establish that from this record.",text:"Try a historical month and year, or a documented topic such as water accounting, satellite observations, soil layers or saving a plan. For unsupported agronomic advice, take the question to a local agronomist.",links:[{label:"Browse documented questions",href:"#/help"},{label:"Inspect sources and limits",href:"#/sources"}]};
}

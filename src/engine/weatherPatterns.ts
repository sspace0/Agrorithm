export const WEATHER_FEATURES = ["meanTminC", "meanTmaxC", "totalRainMm", "dryDayFraction"] as const;
export type WeatherFeature = (typeof WEATHER_FEATURES)[number];
/** Plain display names describe the learned centers, not agronomic thresholds. */
export const plainWeatherPattern = (id: string, fallback: string) => ({
  "pattern-1": "Cooler, drier months",
  "pattern-2": "Warm, drier months",
  "pattern-3": "Hot, wetter months",
  "pattern-4": "Hot, drier months",
}[id] ?? fallback);
export type WeatherFeatures = Record<WeatherFeature, number>;
export interface WeatherPattern {
  id: string;
  label: string;
  center: WeatherFeatures;
  centerStandardized: number[];
  trainingMonths: number;
  heldoutMonths: number;
  representativeTrainingMonth: string;
}
export interface WeatherMonth {
  month: string;
  expectedDays: number;
  completeDays: number;
  coverage: number;
  features: WeatherFeatures;
  split: "training" | "heldout";
  clusterId: string;
  standardizedDistance: number;
}
export interface WeatherPatternModel {
  schemaVersion: string;
  modelVersion: string;
  scope: { latitude: number; longitude: number; period: string[]; timeStandard: string; spatialInterpretation: string };
  featureOrder: string[];
  aggregation: { inputDailyRows: number; acceptedMonths: number; excludedMonths: unknown[] };
  split: { training: string[]; heldout: string[]; policy: string };
  standardizer: { mean: number[]; scale: number[] };
  clusters: WeatherPattern[];
  observations: WeatherMonth[];
  trainingMetrics: { months: number; rootMeanSquaredStandardizedDistance: number };
  heldoutMetrics: { months: number; rootMeanSquaredStandardizedDistance: number };
  fit: { algorithm: string; k: number; seed: number; restarts: number };
  provenance: { publisher: string; product: string; apiVersion: string; sourceSha256: string; rawYearlyResponses: { file: string; url: string; retrieved: string; checksumVerified: boolean }[]; documentation: string[] };
  limitations: string[];
}

export function validWeatherFeatures(features: Partial<WeatherFeatures>): features is WeatherFeatures {
  return !!features && WEATHER_FEATURES.every(key => typeof features[key] === "number" && Number.isFinite(features[key]) && features[key] !== -999) &&
    features.meanTminC! <= features.meanTmaxC! && features.totalRainMm! >= 0 && features.dryDayFraction! >= 0 && features.dryDayFraction! <= 1;
}

export function outsideTrainingRange(model: WeatherPatternModel, features: Partial<WeatherFeatures>): WeatherFeature[] {
  if (!validWeatherFeatures(features)) return [];
  const training = model.observations.filter(row=>row.split === "training");
  return WEATHER_FEATURES.filter(key=>{
    const values = training.map(row=>row.features[key]);
    return !values.length || features[key] < Math.min(...values) || features[key] > Math.max(...values);
  });
}

/** Missing features have no nearest cluster: distance is never computed on a smaller dimension set. */
export function assignWeatherPattern(model: WeatherPatternModel, features: Partial<WeatherFeatures>) {
  if (!validWeatherFeatures(features) || !model.standardizer.scale.every(value => Number.isFinite(value) && value > 0)) return null;
  const vector = WEATHER_FEATURES.map((key, i) => (features[key] - model.standardizer.mean[i]) / model.standardizer.scale[i]);
  const distances = model.clusters.map(cluster => {
    const contributions = vector.map((value, i) => (value - cluster.centerStandardized[i]) ** 2);
    return { cluster, contributions, distance: Math.sqrt(contributions.reduce((sum, value) => sum + value, 0)) };
  }).sort((a,b) => a.distance - b.distance || a.cluster.id.localeCompare(b.cluster.id));
  if (!distances.length || distances.some(item => !Number.isFinite(item.distance))) return null;
  return { nearest: distances[0], distances };
}

export function parseWeatherPatternModel(input: unknown): WeatherPatternModel {
  const fail = () => { throw new Error("The learned weather file is incomplete or uses an unsupported schema."); };
  if (!input || typeof input !== "object") return fail();
  const model = input as WeatherPatternModel;
  if (model.schemaVersion !== "1.0.0" || !model.modelVersion || !Array.isArray(model.featureOrder) || model.featureOrder.join() !== WEATHER_FEATURES.join()) return fail();
  const scaler = model.standardizer;
  if (!scaler || !Array.isArray(scaler.mean) || !Array.isArray(scaler.scale) || scaler.mean.length !== 4 || scaler.scale.length !== 4 || !scaler.mean.every(Number.isFinite) || !scaler.scale.every(n=>Number.isFinite(n)&&n>0)) return fail();
  if (!model.scope || !Number.isFinite(model.scope.latitude) || !Number.isFinite(model.scope.longitude) || model.scope.timeStandard !== "UTC" || !Array.isArray(model.scope.period)) return fail();
  if (!Array.isArray(model.clusters) || model.clusters.length !== 4 || !Array.isArray(model.observations) || !model.observations.length) return fail();
  if (model.clusters.some(c=>!c.id || !c.label || !validWeatherFeatures(c.center) || !Array.isArray(c.centerStandardized) || c.centerStandardized.length !== 4 || !c.centerStandardized.every(Number.isFinite))) return fail();
  const ids = new Set(model.clusters.map(c=>c.id)), months = new Set<string>();
  if (ids.size !== model.clusters.length) return fail();
  for (const row of model.observations) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || months.has(row.month) || !ids.has(row.clusterId) || !validWeatherFeatures(row.features) || row.coverage !== 1 || row.completeDays !== row.expectedDays || !["training","heldout"].includes(row.split) || !Number.isFinite(row.standardizedDistance)) return fail();
    months.add(row.month);
  }
  if (!model.provenance || model.provenance.publisher !== "NASA POWER" || !Array.isArray(model.provenance.rawYearlyResponses) || !Array.isArray(model.limitations) || !model.trainingMetrics || !model.heldoutMetrics || !model.aggregation || !model.split || !model.fit) return fail();
  return model;
}

"""Learn descriptive monthly weather clusters from the project's verified POWER cache."""

from __future__ import annotations

import argparse
import calendar
from collections import Counter, defaultdict
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import random
import sys

FEATURES = [
    {"key": "meanTminC", "label": "Mean daily minimum temperature", "unit": "deg C", "parameter": "T2M_MIN", "aggregation": "arithmetic mean of daily values"},
    {"key": "meanTmaxC", "label": "Mean daily maximum temperature", "unit": "deg C", "parameter": "T2M_MAX", "aggregation": "arithmetic mean of daily values"},
    {"key": "totalRainMm", "label": "Monthly precipitation total", "unit": "mm/month", "parameter": "PRECTOTCORR", "aggregation": "sum of daily mm/day values over the month"},
    {"key": "dryDayFraction", "label": "Fraction of days with precipitation below 1 mm", "unit": "fraction (0-1)", "parameter": "PRECTOTCORR", "aggregation": "count(daily precipitation < 1 mm) / complete days; descriptive threshold"},
]
KEYS = [feature["key"] for feature in FEATURES]
MODEL_VERSION = "power-monthly-kmeans-1.0.0"
SEED = 20261115
TRAIN_START, TRAIN_END = "2018-01", "2022-12"
HOLDOUT_START, HOLDOUT_END = "2023-01", "2024-12"


def finite(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value) and value != -999


def aggregate_months(days):
    """Admit complete UTC months only; no imputation or partial rainfall scaling."""
    groups = defaultdict(list)
    seen = set()
    for row in days:
        day = date.fromisoformat(row["date"])
        if day.isoformat() in seen:
            raise ValueError("Duplicate daily date: " + day.isoformat())
        seen.add(day.isoformat())
        if TRAIN_START <= day.isoformat()[:7] <= HOLDOUT_END:
            groups[day.isoformat()[:7]].append(row)
    accepted, excluded = [], []
    for year in range(2018, 2025):
        for month in range(1, 13):
            key = f"{year}-{month:02d}"
            rows = groups.get(key, [])
            expected = calendar.monthrange(year, month)[1]
            valid = [r for r in rows if all(finite(r.get(k)) for k in ("min", "max", "rain")) and r["min"] <= r["max"] and r["rain"] >= 0]
            coverage = len(valid) / expected
            record = {"month": key, "expectedDays": expected, "observedDays": len(rows), "completeDays": len(valid), "coverage": coverage}
            if len(rows) != expected or len(valid) != expected:
                excluded.append({**record, "reason": "Requires every calendar day and valid Tmin, Tmax and precipitation; no imputation."})
                continue
            record["features"] = {
                "meanTminC": math.fsum(r["min"] for r in valid) / expected,
                "meanTmaxC": math.fsum(r["max"] for r in valid) / expected,
                "totalRainMm": math.fsum(r["rain"] for r in valid),
                "dryDayFraction": sum(r["rain"] < 1 for r in valid) / expected,
            }
            accepted.append(record)
    return accepted, excluded


def vector(record):
    return [record["features"][key] for key in KEYS]


def fit_standardizer(vectors):
    means = [math.fsum(row[j] for row in vectors) / len(vectors) for j in range(len(KEYS))]
    deviations = [math.sqrt(math.fsum((row[j] - means[j]) ** 2 for row in vectors) / len(vectors)) for j in range(len(KEYS))]
    constant = [j for j, value in enumerate(deviations) if value < 1e-12]
    return {"mean": means, "scale": [v if v >= 1e-12 else 1.0 for v in deviations], "populationVarianceDdof": 0, "constantFeatureIndices": constant, "fittedOn": "training months only"}


def transform(vectors, scaler):
    return [[(value - scaler["mean"][j]) / scaler["scale"][j] for j, value in enumerate(row)] for row in vectors]


def distance_squared(a, b):
    return math.fsum((x - y) ** 2 for x, y in zip(a, b))


def assign(vectors, centers):
    labels, distances = [], []
    for row in vectors:
        distances_to_centers = [distance_squared(row, center) for center in centers]
        label = min(range(len(centers)), key=lambda j: (distances_to_centers[j], j))
        labels.append(label)
        distances.append(distances_to_centers[label])
    return labels, distances


def initialize(vectors, k, rng):
    centers = [vectors[int(rng.random() * len(vectors))][:]]
    while len(centers) < k:
        weights = [min(distance_squared(row, center) for center in centers) for row in vectors]
        total = math.fsum(weights)
        if total <= 0:
            raise ValueError("Too few distinct vectors for the chosen cluster count")
        threshold, cumulative, chosen = rng.random() * total, 0.0, None
        for i, weight in enumerate(weights):
            cumulative += weight
            if weight > 0 and cumulative > threshold:
                chosen = i
                break
        if chosen is None:
            chosen = max(range(len(weights)), key=weights.__getitem__)
        centers.append(vectors[chosen][:])
    return centers


def fit_kmeans(vectors, k=4, restarts=24, seed=SEED, max_iterations=300):
    if len(vectors) < 4 * k:
        raise ValueError("At least 4 * k complete training months are required for this small demonstration")
    best = None
    for run in range(restarts):
        centers = initialize(vectors, k, random.Random(seed + run * 104729))
        previous = None
        for iteration in range(1, max_iterations + 1):
            labels, distances = assign(vectors, centers)
            if labels == previous:
                break
            previous = labels
            updated, replaced = [], set()
            for j in range(k):
                members = [row for row, label in zip(vectors, labels) if label == j]
                if members:
                    updated.append([math.fsum(row[d] for row in members) / len(members) for d in range(len(KEYS))])
                else:
                    candidate = max((i for i in range(len(vectors)) if i not in replaced), key=lambda i: (distances[i], -i))
                    replaced.add(candidate)
                    updated.append(vectors[candidate][:])
            centers = updated
        labels, distances = assign(vectors, centers)
        if len(set(labels)) != k:
            continue
        inertia = math.fsum(distances)
        key = (round(inertia, 12), tuple(round(v, 12) for center in centers for v in center))
        if best is None or key < best[0]:
            best = (key, centers, iteration, inertia)
    if best is None:
        raise ValueError("All initializations produced an empty cluster")
    return {"centers": best[1], "iterations": best[2], "inertia": best[3], "restarts": restarts, "maxIterations": max_iterations}


def metrics(distances):
    mean_squared = math.fsum(distances) / len(distances)
    return {"months": len(distances), "meanSquaredStandardizedDistance": mean_squared, "rootMeanSquaredStandardizedDistance": math.sqrt(mean_squared), "meanStandardizedDistance": math.fsum(math.sqrt(d) for d in distances) / len(distances)}


def learn_patterns(monthly, k=4, restarts=24):
    training = [r for r in monthly if TRAIN_START <= r["month"] <= TRAIN_END]
    heldout = [r for r in monthly if HOLDOUT_START <= r["month"] <= HOLDOUT_END]
    if len(training) < 4 * k:
        raise ValueError("Too few complete training months")
    if not heldout:
        raise ValueError("No complete held-out months remain")
    scaler = fit_standardizer([vector(r) for r in training])
    train_x, test_x = transform([vector(r) for r in training], scaler), transform([vector(r) for r in heldout], scaler)
    fitted = fit_kmeans(train_x, k=k, restarts=restarts)
    native = [[value * scaler["scale"][j] + scaler["mean"][j] for j, value in enumerate(center)] for center in fitted["centers"]]
    order = sorted(range(k), key=lambda j: ((native[j][0] + native[j][1]) / 2, native[j][2], tuple(native[j])))
    centers = [fitted["centers"][i] for i in order]
    native = [native[i] for i in order]
    train_labels, train_distances = assign(train_x, centers)
    test_labels, test_distances = assign(test_x, centers)
    midpoint = [(r["features"]["meanTminC"] + r["features"]["meanTmaxC"]) / 2 for r in training]
    midpoint_mean = math.fsum(midpoint) / len(midpoint)
    midpoint_std = math.sqrt(math.fsum((v - midpoint_mean) ** 2 for v in midpoint) / len(midpoint))
    rain_reference = scaler["mean"][2]
    clusters = []
    for j, values in enumerate(native):
        average = (values[0] + values[1]) / 2
        temperature = "Cooler" if average < midpoint_mean - .5 * midpoint_std else "Warmer" if average > midpoint_mean + .5 * midpoint_std else "Intermediate temperature"
        rain = "higher monthly rainfall" if values[2] > rain_reference else "lower monthly rainfall"
        members = [i for i, label in enumerate(train_labels) if label == j]
        representative = min(members, key=lambda i: (train_distances[i], training[i]["month"]))
        clusters.append({"id": f"pattern-{j + 1}", "label": temperature + " / " + rain, "center": dict(zip(KEYS, values)), "centerStandardized": centers[j], "trainingMonths": len(members), "heldoutMonths": test_labels.count(j), "representativeTrainingMonth": training[representative]["month"], "trainingCalendarMonthCounts": dict(sorted(Counter(training[i]["month"][5:] for i in members).items()))})
    observations = []
    for records, labels, distances, split in [(training, train_labels, train_distances, "training"), (heldout, test_labels, test_distances, "heldout")]:
        observations.extend({**r, "split": split, "clusterId": f"pattern-{label + 1}", "standardizedDistance": math.sqrt(distance), "assignmentStatus": "modeled descriptive nearest-center assignment"} for r, label, distance in zip(records, labels, distances))
    return {"standardizer": scaler, "clusters": clusters, "observations": observations, "trainingMetrics": metrics(train_distances), "heldoutMetrics": metrics(test_distances), "fit": {"algorithm": "Lloyd k-means with k-means++ initialization", "k": k, "seed": SEED, "restarts": fitted["restarts"], "selectedRunIterations": fitted["iterations"], "maxIterations": fitted["maxIterations"], "stoppingRule": "unchanged training memberships or maximum iterations", "selectionCriterion": "lowest training inertia; deterministic tie break", "trainingInertia": fitted["inertia"]}, "labelRules": {"fittedOn": "training months only", "midpointTemperatureMeanC": midpoint_mean, "midpointTemperatureStdC": midpoint_std, "coolerWarmerOffsetStd": .5, "monthlyRainfallReferenceMm": rain_reference, "interpretation": "Relative descriptive names from learned centers, not crop thresholds or drought classes."}}


def verify_sources(input_path, data):
    if data.get("status") != "genuine cached observation" or data.get("publisher") != "NASA POWER":
        raise ValueError("Training requires the genuine NASA POWER cache, not a synthetic or private farm fixture")
    if data.get("timeStandard") != "UTC":
        raise ValueError("This model version requires UTC daily records")
    if not finite(data.get("latitude")) or not finite(data.get("longitude")) or not -90 <= data["latitude"] <= 90 or not -180 <= data["longitude"] <= 180:
        raise ValueError("Valid declared source coordinates are required")
    units = data.get("parameters", {})
    if units.get("T2M_MIN", {}).get("units") != "C" or units.get("T2M_MAX", {}).get("units") != "C" or units.get("PRECTOTCORR", {}).get("units") != "mm/day":
        raise ValueError("Unexpected source parameter units")
    provenance_path = input_path.parent / "provenance.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    expected_days, verified = {}, []
    for record in provenance:
        if record["file"] not in {f"power-{year}.json" for year in range(2018, 2025)}:
            continue
        raw_path = input_path.parent / record["file"]
        if hashlib.sha256(raw_path.read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError("Raw source checksum mismatch: " + record["file"])
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        coordinates = raw.get("geometry", {}).get("coordinates", [])
        if raw.get("geometry", {}).get("type") != "Point" or len(coordinates) < 2 or not all(finite(v) for v in coordinates[:2]) or abs(coordinates[0] - data["longitude"]) > 1e-8 or abs(coordinates[1] - data["latitude"]) > 1e-8:
            raise ValueError("Raw source coordinates do not match the declared processed location")
        if raw.get("header", {}).get("time_standard") != data["timeStandard"]:
            raise ValueError("Raw and processed time standards differ")
        if any(raw.get("parameters", {}).get(parameter, {}).get("units") != units[parameter]["units"] for parameter in ("T2M_MIN", "T2M_MAX", "PRECTOTCORR")):
            raise ValueError("Raw and processed parameter units differ")
        year = record["file"][6:10]
        if raw.get("header", {}).get("start") != year + "0101" or raw.get("header", {}).get("end") != year + "1231":
            raise ValueError("Raw response dates do not match the provenance year")
        values = raw["properties"]["parameter"]
        for key in values["T2M_MIN"]:
            day = f"{key[:4]}-{key[4:6]}-{key[6:8]}"
            clean = lambda v: v if finite(v) and v != raw["header"].get("fill_value", -999) else None
            expected_days[day] = {"date": day, "min": clean(values["T2M_MIN"][key]), "max": clean(values["T2M_MAX"][key]), "rain": clean(values["PRECTOTCORR"][key])}
        verified.append({**record, "checksumVerified": True})
    if len(verified) != 7 or len(expected_days) != 2557:
        raise ValueError("Expected seven complete source years (2018-2024)")
    if data.get("dates") != [min(expected_days), max(expected_days)]:
        raise ValueError("Declared observation dates do not match raw daily coverage")
    if sorted(data["days"], key=lambda r: r["date"]) != [expected_days[key] for key in sorted(expected_days)]:
        raise ValueError("Processed weather cache does not match verified raw responses")
    return verified


def rounded(value):
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("Nonfinite model output")
        return round(value, 12) or 0.0
    if isinstance(value, dict):
        return {key: rounded(item) for key, item in value.items()}
    if isinstance(value, list):
        return [rounded(item) for item in value]
    return value


def main():
    project = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=project / "public/data/weather.json")
    parser.add_argument("--output", type=Path, default=project / "public/data/weather-patterns.json")
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    raw = verify_sources(args.input, data)
    months, excluded = aggregate_months(data["days"])
    learned = learn_patterns(months)
    output = rounded({"schemaVersion": "1.0.0", "modelVersion": MODEL_VERSION, "name": "Historical monthly weather patterns", "status": "trained descriptive model derived from genuine cached NASA observations", "scope": {"latitude": data["latitude"], "longitude": data["longitude"], "timeStandard": "UTC", "period": data["dates"], "meteorologyGridDegrees": {"latitude": .5, "longitude": .625}, "spatialInterpretation": "Regional gridded MERRA-2/POWER meteorology, not a farm sensor or field-resolution observation."}, "featureOrder": KEYS, "features": FEATURES, "aggregation": {"minimumCompleteDayCoverage": 1, "inputDailyRows": len(data["days"]), "acceptedMonths": len(months), "excludedMonths": excluded, "missingnessPolicy": "Exclude incomplete/invalid months; no imputation or rainfall upscaling.", "observationStatus": "monthly aggregation of genuine cached observations"}, "split": {"training": [TRAIN_START, TRAIN_END], "heldout": [HOLDOUT_START, HOLDOUT_END], "policy": "chronological; heldout months never fit scaling, centers, names or restart selection"}, **learned, "metricInterpretation": "Quantization errors measure distance from learned historical centers in standardized feature space. They are not predictive accuracy, success probabilities or future-climate validation.", "provenance": {"publisher": data["publisher"], "product": data["product"], "apiVersion": data["header"]["api"]["version"], "sourceFile": "data/weather.json", "sourceSha256": hashlib.sha256(args.input.read_bytes()).hexdigest(), "rawYearlyResponses": raw, "cachedHeaderScope": "The cache retains the final yearly (2024) response header; the daily rows cover all seven verified years.", "documentation": ["https://power.larc.nasa.gov/docs/services/api/temporal/daily/", "https://power.larc.nasa.gov/docs/methodology/", "https://scikit-learn.org/stable/modules/clustering.html#k-means"], "runtime": "Python standard library " + ".".join(map(str, sys.version_info[:3]))}, "limitations": ["One regional point, seven years and only 60 training months; strong seasonality and correlated features limit independence.", "Four clusters were chosen as a compact descriptive demonstration, not selected as a universal or optimal climate classification.", "Tmin and Tmax are correlated and both enter the distance; rainfall totals and dry-day fraction can also be correlated.", "Monthly rainfall totals depend partly on month length; dry-day fraction uses the stated 1 mm/day descriptive threshold.", "No crop, soil, yield, irrigation, suitability, forecast or groundwater model is trained here; no agronomic validation is claimed.", "A heldout nearest-center assignment describes a supplied historical month. It is not a forecast or calibrated probability."]})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"modelVersion": MODEL_VERSION, "dailyRows": len(data["days"]), "acceptedMonths": len(months), "trainingMonths": learned["trainingMetrics"]["months"], "heldoutMonths": learned["heldoutMetrics"]["months"], "excludedMonths": len(excluded), "trainingQuantizationRmse": learned["trainingMetrics"]["rootMeanSquaredStandardizedDistance"], "heldoutQuantizationRmse": learned["heldoutMetrics"]["rootMeanSquaredStandardizedDistance"], "bytes": args.output.stat().st_size}))


if __name__ == "__main__":
    main()

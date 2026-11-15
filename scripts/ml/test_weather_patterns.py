"""Software checks; synthetic perturbations are never written to the observation cache."""

import copy
import hashlib
import json
import math
import shutil
import tempfile
from pathlib import Path
import unittest

import train_weather_patterns as model


class WeatherPatternsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.input_path = Path(__file__).resolve().parents[2] / "public/data/weather.json"
        cls.data = json.loads(cls.input_path.read_text(encoding="utf-8"))
        cls.monthly, cls.excluded = model.aggregate_months(cls.data["days"])

    def test_complete_leap_month_and_missing_sentinel(self):
        february = [{"date": f"2020-02-{i:02d}", "min": 10, "max": 20, "rain": 1} for i in range(1, 30)]
        accepted, _ = model.aggregate_months(february)
        self.assertEqual(accepted[0]["expectedDays"], 29)
        self.assertEqual(accepted[0]["features"]["totalRainMm"], 29)
        self.assertEqual(accepted[0]["features"]["dryDayFraction"], 0)
        february[5]["min"] = -999
        accepted, excluded = model.aggregate_months(february)
        self.assertEqual(accepted, [])
        self.assertEqual(next(r for r in excluded if r["month"] == "2020-02")["completeDays"], 28)
        with self.assertRaises(ValueError):
            model.aggregate_months(february + [february[0]])

    def test_verified_sources_and_chronological_membership(self):
        self.assertEqual(len(model.verify_sources(self.input_path, self.data)), 7)
        self.assertEqual(len(self.monthly), 84)
        self.assertFalse(self.excluded)
        result = model.learn_patterns(self.monthly)
        training = [r for r in result["observations"] if r["split"] == "training"]
        heldout = [r for r in result["observations"] if r["split"] == "heldout"]
        self.assertEqual((len(training), len(heldout)), (60, 24))
        self.assertTrue(all(r["month"] <= "2022-12" for r in training))
        self.assertTrue(all("2023-01" <= r["month"] <= "2024-12" for r in heldout))
        self.assertEqual(sum(c["trainingMonths"] for c in result["clusters"]), 60)
        self.assertEqual(sum(c["heldoutMonths"] for c in result["clusters"]), 24)
        self.assertTrue(all(math.isfinite(v) for c in result["clusters"] for v in c["centerStandardized"]))

    def test_heldout_perturbation_cannot_refit_scaler_centers_or_labels(self):
        baseline = model.learn_patterns(self.monthly)
        altered = copy.deepcopy(self.monthly)
        for row in altered:
            if row["month"] >= "2023-01":
                row["features"]["meanTminC"] += 100
                row["features"]["meanTmaxC"] += 100
                row["features"]["totalRainMm"] += 1000
        changed = model.learn_patterns(altered)
        self.assertEqual(baseline["standardizer"], changed["standardizer"])
        self.assertEqual(baseline["labelRules"], changed["labelRules"])
        self.assertEqual([c["centerStandardized"] for c in baseline["clusters"]], [c["centerStandardized"] for c in changed["clusters"]])
        self.assertEqual(baseline["trainingMetrics"], changed["trainingMetrics"])
        self.assertNotEqual(baseline["heldoutMetrics"], changed["heldoutMetrics"])

    def test_repeatability_constant_feature_and_nearest_assignment(self):
        first = model.learn_patterns(self.monthly)
        second = model.learn_patterns(self.monthly)
        self.assertEqual(first, second)
        scaler = model.fit_standardizer([[1, i, 0, .5] for i in range(20)])
        self.assertEqual(scaler["constantFeatureIndices"], [0, 2, 3])
        self.assertTrue(all(math.isfinite(v) for row in model.transform([[1, 2, 0, .5]], scaler) for v in row))
        centers = [c["centerStandardized"] for c in first["clusters"]]
        transformed = model.transform([model.vector(r) for r in first["observations"]], first["standardizer"])
        labels, _ = model.assign(transformed, centers)
        self.assertEqual([r["clusterId"] for r in first["observations"]], [f"pattern-{j + 1}" for j in labels])

    def test_serialized_artifact_matches_source_and_nearest_centers(self):
        artifact_path = self.input_path.parent / "weather-patterns.json"
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        self.assertEqual(artifact["provenance"]["sourceSha256"], hashlib.sha256(self.input_path.read_bytes()).hexdigest())
        self.assertEqual(artifact["modelVersion"], model.MODEL_VERSION)
        rows = artifact["observations"]
        scaled = model.transform([model.vector(r) for r in rows], artifact["standardizer"])
        labels, distances = model.assign(scaled, [c["centerStandardized"] for c in artifact["clusters"]])
        self.assertEqual([r["clusterId"] for r in rows], [f"pattern-{j + 1}" for j in labels])
        self.assertTrue(all(abs(math.sqrt(d) - r["standardizedDistance"]) < 1e-9 for d, r in zip(distances, rows)))

    def test_declared_coordinate_and_date_tampering_is_rejected(self):
        for key, value in [("latitude", 0), ("longitude", -73), ("latitude", None), ("dates", ["2018-01-01", "2025-12-31"])]:
            altered = copy.deepcopy(self.data)
            altered[key] = value
            with self.assertRaises(ValueError):
                model.verify_sources(self.input_path, altered)

    def test_raw_metadata_cannot_disagree_even_with_updated_checksum(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary)
            records = json.loads((self.input_path.parent / "provenance.json").read_text(encoding="utf-8"))
            for record in records:
                if record["file"].startswith("power-"):
                    shutil.copy2(self.input_path.parent / record["file"], destination / record["file"])
            raw_original = json.loads((self.input_path.parent / "power-2018.json").read_text(encoding="utf-8"))
            for variant in ("coordinates", "time", "units", "dates"):
                raw = copy.deepcopy(raw_original)
                if variant == "coordinates": raw["geometry"]["coordinates"][0] = -73
                elif variant == "time": raw["header"]["time_standard"] = "LST"
                elif variant == "units": raw["parameters"]["PRECTOTCORR"]["units"] = "cm/day"
                else: raw["header"]["end"] = "20191231"
                raw_path = destination / "power-2018.json"
                raw_path.write_text(json.dumps(raw), encoding="utf-8")
                for record in records:
                    if record["file"] == "power-2018.json": record["sha256"] = hashlib.sha256(raw_path.read_bytes()).hexdigest()
                (destination / "provenance.json").write_text(json.dumps(records), encoding="utf-8")
                with self.assertRaises(ValueError):
                    model.verify_sources(destination / "weather.json", self.data)


if __name__ == "__main__":
    unittest.main()

import { useEffect, useRef, useState } from "react";
import { LocateFixed, LoaderCircle } from "lucide-react";
import type { CoordinateEvidence } from "../engine/types";

export default function FindFarmLocation({
  onPick,
  selectionKey,
  evidence,
}: {
  onPick: (lat: number, lon: number, evidence: CoordinateEvidence) => void;
  selectionKey: string;
  evidence?: CoordinateEvidence;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  useEffect(() => {
    version.current++;
    setBusy(false);
    setError("");
    return () => {
      version.current++;
    };
  }, [selectionKey]);
  const locate = () => {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(
        "Device location is unavailable here. Open the HTTPS site, or search or enter coordinates.",
      );
      return;
    }
    const request = ++version.current;
    setBusy(true);
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (version.current !== request) return;
          setBusy(false);
          const { latitude, longitude, accuracy } = position.coords;
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
          ) {
            setError(
              "The device returned an invalid position. Search or enter coordinates instead.",
            );
            return;
          }
          onPick(latitude, longitude, {
            method: "device-geolocation",
            accuracyM:
              Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
            capturedAt: new Date(
              Number.isFinite(position.timestamp)
                ? position.timestamp
                : Date.now(),
            ).toISOString(),
          });
        },
        (failure) => {
          if (version.current !== request) return;
          setBusy(false);
          setError(
            failure.code === 1
              ? "Location permission was denied. Your selection is unchanged; search or enter coordinates instead."
              : failure.code === 3
                ? "Location took too long. Try again, or search or enter coordinates."
                : "Your device could not find a position. Search or enter coordinates instead.",
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    } catch {
      setBusy(false);
      setError(
        "Device location is blocked here. Search or enter coordinates instead.",
      );
    }
  };
  return (
    <div className="find-farm-location">
      <button
        type="button"
        className="locate-farm-button"
        onClick={locate}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? (
          <LoaderCircle size={18} aria-hidden="true" />
        ) : (
          <LocateFixed size={18} aria-hidden="true" />
        )}
        {busy ? "Finding your location…" : "Find your farm’s location"}
      </button>
      <p className="location-context">
        Uses this device’s position with your permission. Check you are at your
        farm; this does not locate a field boundary.
      </p>
      {evidence && (
        <p className="location-estimate" role="status">
          Device estimate ·{" "}
          {evidence.accuracyM === null
            ? "accuracy unknown"
            : `reported accuracy ±${Math.ceil(evidence.accuracyM).toLocaleString()} m`}{" "}
          · {new Date(evidence.capturedAt).toLocaleString()}
          <br />
          Confirm the point is your farm, or adjust the coordinates.
        </p>
      )}
      {error && (
        <p className="location-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

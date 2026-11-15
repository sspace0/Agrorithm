/** Keep remembered display filters within the observations actually loaded. */
export function observationDates(
  requestedFrom: string,
  requestedTo: string,
  availableFrom: string,
  availableTo: string,
) {
  if (!availableFrom || !availableTo) return { from: "", to: "" };
  const clamp = (value: string, fallback: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value < availableFrom
        ? availableFrom
        : value > availableTo
          ? availableTo
          : value
      : fallback;
  const to = clamp(requestedTo, availableTo);
  const from = clamp(requestedFrom, availableFrom);
  return { from: from > to ? to : from, to };
}

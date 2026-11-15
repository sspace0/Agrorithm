const decimal = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
/** Display rounding never changes the scientific values stored or exported. */
export function formatNumber(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "Unknown"
    : `${decimal.format(Object.is(value, -0) ? 0 : value)}${suffix}`;
}

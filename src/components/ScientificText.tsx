import { Fragment, type ReactNode } from "react";

/** Render a small, explicit notation subset without interpreting HTML or URLs. */
export function scientificParts(text: string): ReactNode[] {
  text = text.replace(/\bT(min|max|mean)\b/g, "T_{$1}")
    .replace(/\bET([0c])\b/g, "ET_{$1}")
    .replace(/\bKc\b/g, "K_{c}");
  const parts: ReactNode[] = [];
  const notation = /(\^|_)(?:\{([^{}\n]+)\}|([+-]?\d+(?:\.\d+)?))/g;
  let cursor = 0;
  for (const match of text.matchAll(notation)) {
    if (match.index! > cursor) parts.push(text.slice(cursor, match.index));
    const value = match[2] ?? match[3];
    parts.push(match[1] === "^" ? <sup key={match.index}>{value}</sup> : <sub key={match.index}>{value}</sub>);
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default function ScientificText({ children }: { children: string }) {
  return <>{scientificParts(children).map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

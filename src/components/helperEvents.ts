import type { HelperPlanContext } from "../engine/helperPlanContext";

export const HELPER_REQUEST_EVENT = "agrorithm-request-help";
export interface HelperRequest { context?: HelperPlanContext; question: string; opener?: HTMLElement; }

/** Open the existing local helper with the exact result snapshot the farmer is reviewing. */
export function requestAgrorithmHelp(context?: HelperPlanContext, question = "Explain my results", opener?: HTMLElement) {
  window.dispatchEvent(new CustomEvent<HelperRequest>(HELPER_REQUEST_EVENT, {
    detail: { context: context ? structuredClone(context) : undefined, question, opener },
  }));
}

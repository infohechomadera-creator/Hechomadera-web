/**
 * Analytics — capa de abstracción para GA4 + Vercel Analytics.
 *
 * Uso: import { track } from "@/lib/analytics"
 *      track("whatsapp_click", { location: "header" })
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/* ─── event catalogue ────────────────────────────────────── */
export type AnalyticsEvent =
  // conversion
  | "whatsapp_click"
  | "contact_form_submit"
  | "checkout_start"
  | "checkout_error"
  // tools
  | "estimator_start"
  | "estimator_complete"
  | "quiz_start"
  | "quiz_complete"
  | "pdf_download"
  // store
  | "product_view"
  | "filter_apply"
  | "category_click"
  // engagement
  | "scroll_depth"
  | "time_on_page"
  | "section_view"
  | "cta_click"
  | "nav_click"
  | "outbound_click";

export interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/** Fires a GA4 event if gtag is loaded (i.e., user has consented). */
export function track(event: AnalyticsEvent, params?: EventParams) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, params ?? {});
    }
  } catch { /* fail silently */ }
}

/* ─── consent helpers ────────────────────────────────────── */
export const CONSENT_KEY = "hechomadera_cookie_consent_v1";
export const CONSENT_EVENT = "hm_consent_update";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function setConsent(value: "accepted" | "necessary") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch { /* ignore */ }
}

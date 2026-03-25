"use client";

/**
 * PageTracker — mounted globally in layout.tsx
 *
 * Tracks via event delegation (no per-component wiring needed for most events):
 * · scroll_depth      — 25 / 50 / 75 / 90 %
 * · time_on_page      — seconds spent, fired on page hide / navigation
 * · section_view      — first time a [data-track-section] enters viewport
 * · whatsapp_click    — any <a> with href containing wa.me (reads data-track-location)
 * · cta_click         — any element with [data-track-cta] attribute
 * · nav_click         — any element with [data-track-nav] attribute
 * · outbound_click    — any <a> pointing to an external domain
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

export function PageTracker() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const scrollMilestones = useRef(new Set<number>());
  const seenSections = useRef(new Set<string>());

  /* ── reset on navigation ── */
  useEffect(() => {
    startTime.current = Date.now();
    scrollMilestones.current = new Set();
    seenSections.current = new Set();
  }, [pathname]);

  /* ── scroll depth ── */
  useEffect(() => {
    const MILESTONES = [25, 50, 75, 90];

    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((window.scrollY / docHeight) * 100);
      for (const m of MILESTONES) {
        if (pct >= m && !scrollMilestones.current.has(m)) {
          scrollMilestones.current.add(m);
          track("scroll_depth", { depth: m, page: pathname });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  /* ── time on page (visibility change — works on mobile) ── */
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") {
        const seconds = Math.round((Date.now() - startTime.current) / 1000);
        if (seconds > 2) track("time_on_page", { seconds, page: pathname });
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pathname]);

  /* ── section visibility (IntersectionObserver) ── */
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-track-section]");
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = (entry.target as HTMLElement).dataset.trackSection;
          if (name && !seenSections.current.has(name)) {
            seenSections.current.add(name);
            track("section_view", { section: name, page: pathname });
          }
        }
      },
      { threshold: 0.3 },
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  /* ── click delegation ── */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element;

      /* WhatsApp — any <a href> containing wa.me */
      const waLink = target.closest<HTMLAnchorElement>("a[href*='wa.me']");
      if (waLink) {
        const location = waLink.dataset.trackLocation ?? "unknown";
        track("whatsapp_click", { location, page: pathname });
        return;
      }

      /* CTA button with data-track-cta */
      const ctaEl = target.closest<HTMLElement>("[data-track-cta]");
      if (ctaEl) {
        track("cta_click", { label: ctaEl.dataset.trackCta, page: pathname });
        return;
      }

      /* Nav link with data-track-nav */
      const navEl = target.closest<HTMLElement>("[data-track-nav]");
      if (navEl) {
        track("nav_click", { label: navEl.dataset.trackNav, page: pathname });
        return;
      }

      /* Outbound link */
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link) {
        const href = link.href;
        if (href && !href.startsWith(window.location.origin) && !href.startsWith("/") && !href.startsWith("#")) {
          if (!href.includes("wa.me")) {
            track("outbound_click", { url: href, page: pathname });
          }
        }
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}

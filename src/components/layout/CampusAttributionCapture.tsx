"use client";

import { useEffect } from "react";
import { captureCampusAttributionFromUrl } from "@/analytics/campus-attribution";
import { captureUtmContextFromUrl } from "@/analytics/utm-context";

/**
 * Runs once on mount: parses UTM params and persists first-touch campus slug (campaign-gated).
 * No UI.
 */
export default function CampusAttributionCapture() {
  useEffect(() => {
    captureCampusAttributionFromUrl();
    captureUtmContextFromUrl();
  }, []);
  return null;
}

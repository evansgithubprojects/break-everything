"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const FAVORITES_KEY = "be:favorites:v1";
const FAVORITES_EVENT = "be:favorites:changed";
const EMPTY_FAVORITES: string[] = [];
let cachedRawFavorites = "";
let cachedFavorites: string[] = EMPTY_FAVORITES;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSlug(value: string): string {
  return value.trim();
}

function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const next: string[] = [];
    const seen = new Set<string>();
    for (const value of parsed) {
      if (typeof value !== "string") continue;
      const slug = normalizeSlug(value);
      if (!slug) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      next.push(slug);
    }
    return next;
  } catch {
    return [];
  }
}

function readFavorites(): string[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(FAVORITES_KEY) ?? "";
  if (raw === cachedRawFavorites) {
    return cachedFavorites;
  }
  cachedRawFavorites = raw;
  cachedFavorites = parseFavorites(raw);
  return cachedFavorites;
}

function writeFavorites(next: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(FAVORITES_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(FAVORITES_EVENT, onStoreChange);
      };
    },
    readFavorites,
    () => EMPTY_FAVORITES
  );

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback(
    (slug: string): boolean => {
      return favoriteSet.has(normalizeSlug(slug));
    },
    [favoriteSet]
  );

  const toggleFavorite = useCallback(
    (slug: string): boolean => {
      const value = normalizeSlug(slug);
      if (!value) return false;
      const current = readFavorites();
      const isFav = current.includes(value);
      const next = isFav ? current.filter((entry) => entry !== value) : [...current, value];
      writeFavorites(next);
      return !isFav;
    },
    []
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}


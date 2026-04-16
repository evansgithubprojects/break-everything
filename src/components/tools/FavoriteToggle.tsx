"use client";

import type { MouseEvent } from "react";
import { useFavorites } from "./useFavorites";

function isolateActionInteraction(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

export default function FavoriteToggle({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(slug);
  const label = favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`;

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    isolateActionInteraction(e);
    toggleFavorite(slug);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onPointerDownCapture={isolateActionInteraction}
      aria-pressed={favorite}
      aria-label={label}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className="w-4 h-4 shrink-0"
        fill={favorite ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.914c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.08 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.517-4.674z"
        />
      </svg>
      <span>{favorite ? "Favorited" : "Favorite"}</span>
    </button>
  );
}


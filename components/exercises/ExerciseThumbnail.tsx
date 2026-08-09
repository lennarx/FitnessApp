"use client";

import { useState } from "react";

export function ExerciseThumbnail({
  imageUrl,
  alt,
}: {
  imageUrl: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-neutral-500">
        <span className="text-lg">🏋️</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote, per-row image; next/image would need a configured remote pattern for every user-facing exercise image host.
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-md bg-neutral-800 object-cover"
    />
  );
}

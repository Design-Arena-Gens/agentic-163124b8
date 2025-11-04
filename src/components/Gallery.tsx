"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import PhotoCard from "@/components/PhotoCard";

export default function Gallery() {
  const { photos, filters } = useStore();

  const visible = useMemo(() => {
    return photos
      .filter((p) => (filters.orientation === "any" ? true : p.orientation === filters.orientation))
      .filter((p) => (p.score ?? -1) >= filters.minScore)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [photos, filters]);

  if (visible.length === 0) {
    return <p className="text-sm text-zinc-500">No photos yet. Import images to begin.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {visible.map((p) => (
        <PhotoCard key={p.id} photo={p} />)
      )}
    </div>
  );
}

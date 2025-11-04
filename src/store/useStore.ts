import { create } from "zustand";
import { ClientBrief, Filters, PhotoFile, PhotoId } from "@/types";

export type AppState = {
  photos: PhotoFile[];
  selectedIds: Set<PhotoId>;
  isScoring: boolean;
  filters: Filters;
  brief: ClientBrief;
  setPhotos: (photos: PhotoFile[]) => void;
  upsertPhoto: (photo: PhotoFile) => void;
  removePhoto: (id: PhotoId) => void;
  clear: () => void;
  setScoring: (val: boolean) => void;
  toggleSelected: (id: PhotoId) => void;
  selectTopN: (count: number) => void;
  setFilters: (f: Partial<Filters>) => void;
  setBrief: (b: Partial<ClientBrief>) => void;
};

export const useStore = create<AppState>((set, get) => ({
  photos: [],
  selectedIds: new Set<PhotoId>(),
  isScoring: false,
  filters: {
    orientation: "any",
    minScore: 0,
    tags: [],
  },
  brief: {
    desiredCount: 100,
    orientationPreference: "any",
    prioritizePeople: false,
    brightness: "balanced",
    contrast: "any",
  },
  setPhotos: (photos) => set({ photos }),
  upsertPhoto: (photo) =>
    set((state) => ({
      photos: state.photos.some((p) => p.id === photo.id)
        ? state.photos.map((p) => (p.id === photo.id ? photo : p))
        : [...state.photos, photo],
    })),
  removePhoto: (id) =>
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) })),
  clear: () => set({ photos: [], selectedIds: new Set<PhotoId>() }),
  setScoring: (val) => set({ isScoring: val }),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectTopN: (count) =>
    set((state) => {
      const eligible = state.photos
        .filter((p) => (state.filters.orientation === "any" ? true : p.orientation === state.filters.orientation))
        .filter((p) => (p.score ?? -1) >= state.filters.minScore)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, count);
      return { selectedIds: new Set(eligible.map((p) => p.id)) };
    }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setBrief: (b) => set((s) => ({ brief: { ...s.brief, ...b } })),
}));

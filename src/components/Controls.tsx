"use client";

import { useStore } from "@/store/useStore";

export default function Controls() {
  const { brief, setBrief, filters, setFilters, selectTopN } = useStore();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="font-semibold">Client brief</h3>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Desired picks</label>
          <input
            type="number"
            value={brief.desiredCount}
            onChange={(e) => setBrief({ desiredCount: Number(e.target.value) || 0 })}
            className="w-24 rounded border px-2 py-1 bg-transparent"
            min={1}
          />
          <button
            className="ml-2 rounded bg-indigo-600 text-white px-3 py-1 text-sm"
            onClick={() => selectTopN(brief.desiredCount)}
          >
            Auto select
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Orientation</label>
          <select
            value={brief.orientationPreference}
            onChange={(e) => setBrief({ orientationPreference: e.target.value as any })}
            className="rounded border px-2 py-1 bg-transparent"
          >
            <option value="any">Any</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">People priority</label>
          <input
            type="checkbox"
            checked={brief.prioritizePeople}
            onChange={(e) => setBrief({ prioritizePeople: e.target.checked })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Brightness</label>
          <select
            value={brief.brightness}
            onChange={(e) => setBrief({ brightness: e.target.value as any })}
            className="rounded border px-2 py-1 bg-transparent"
          >
            <option value="any">Any</option>
            <option value="bright">Bright</option>
            <option value="balanced">Balanced</option>
            <option value="moody">Moody</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Contrast</label>
          <select
            value={brief.contrast}
            onChange={(e) => setBrief({ contrast: e.target.value as any })}
            className="rounded border px-2 py-1 bg-transparent"
          >
            <option value="any">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Filters</h3>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Orientation</label>
          <select
            value={filters.orientation}
            onChange={(e) => setFilters({ orientation: e.target.value as any })}
            className="rounded border px-2 py-1 bg-transparent"
          >
            <option value="any">Any</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40 text-sm text-zinc-500">Min score</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(filters.minScore * 100)}
            onChange={(e) => setFilters({ minScore: Number(e.target.value) / 100 })}
            className="w-48"
          />
          <span className="text-sm">{Math.round(filters.minScore * 100)}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { TOOLS } from "@/lib/tools/catalog";
import type { ToolId } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

interface ToolPickerProps {
  selected: ToolId;
  onSelect: (id: ToolId) => void;
}

export function ToolPicker({ selected, onSelect }: ToolPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {TOOLS.map((tool) => {
        const active = tool.id === selected;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(tool.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition",
              active
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <span
              className={cn(
                "block text-sm font-semibold",
                active ? "text-brand-700" : "text-slate-800",
              )}
            >
              {tool.label}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">{tool.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import type { ToolMeta, ToolOptions as Options } from "@/lib/tools/types";

interface ToolOptionsProps {
  tool: ToolMeta;
  values: Options;
  onChange: (key: string, value: string | boolean) => void;
}

export function ToolOptions({ tool, values, onChange }: ToolOptionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tool.fields.map((field) => {
        const value = values[field.key];

        if (field.type === "toggle") {
          return (
            <label
              key={field.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:col-span-2"
            >
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  {field.label}
                </span>
                {field.help && (
                  <span className="block text-xs text-slate-500">{field.help}</span>
                )}
              </span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(field.key, e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-200"
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.key}>
              <label className="field-label" htmlFor={`opt-${field.key}`}>
                {field.label}
              </label>
              <select
                id={`opt-${field.key}`}
                className="select-input"
                value={String(value ?? "")}
                onChange={(e) => onChange(field.key, e.target.value)}
              >
                {field.choices?.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {field.help && (
                <p className="mt-1 text-xs text-slate-500">{field.help}</p>
              )}
            </div>
          );
        }

        // text
        return (
          <div key={field.key}>
            <label className="field-label" htmlFor={`opt-${field.key}`}>
              {field.label}
            </label>
            <input
              id={`opt-${field.key}`}
              type="text"
              className="select-input"
              value={String(value ?? "")}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
            {field.help && (
              <p className="mt-1 text-xs text-slate-500">{field.help}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

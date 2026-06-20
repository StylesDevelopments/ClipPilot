import Link from "next/link";
import { TOOLS } from "@/lib/tools/catalog";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Runs locally · no account needed
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          A quick repair toolbox for your shaky clips
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          Drop in a short video, smooth out the wobble, and download the result.
          Compress, convert and trim too — all processed on your own machine.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Upload a video
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Supports .mp4, .mov and .m4v
        </p>
      </section>

      {/* Tools */}
      <section className="pb-20">
        <h2 className="mb-5 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
          What&apos;s in the box
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <div key={tool.id} className="card p-5">
              <h3 className="text-base font-semibold text-slate-900">{tool.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{tool.tagline}</p>
              <p className="mt-3 text-sm text-slate-600">{tool.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m22 8-6 4 6 4V8Z" />
              <rect width="14" height="12" x="2" y="6" rx="2" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ClipPilot
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/workspace"
            className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
          >
            Workspace
          </Link>
          <a
            href="https://github.com/stylesdevelopments/clippilot"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

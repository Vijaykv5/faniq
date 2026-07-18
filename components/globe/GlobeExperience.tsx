"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { ATLAS_MEMORIES, getCountryStats } from "@/lib/atlas-globe-data";
import { SolanaWalletButton } from "@/components/wallet/SolanaWalletButton";

const BuilderGlobe = dynamic(() => import("./BuilderGlobe"), {
  ssr: false,
  loading: () => <GlobeLoadingState />,
});

function GlobeLoadingState() {
  return (
    <div className="grid h-svh min-h-[640px] w-screen place-items-center bg-[#05070d] text-white">
      <div className="w-64 text-center">
        <p className="loadscreen-title">atlas</p>
        <div className="loadscreen-bar mt-4">
          <span className="loadscreen-bar-fill" />
        </div>
        <p className="loadscreen-percent mt-3">building globe</p>
      </div>
    </div>
  );
}

export function GlobeExperience() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const stats = useMemo(() => getCountryStats(ATLAS_MEMORIES), []);
  const selectedHub = selectedCountry ? stats.find((stat) => stat.country === selectedCountry) : null;

  return (
    <main className="relative h-svh min-h-[640px] overflow-hidden bg-[#05070d] text-white">
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(155,69,254,0.1),transparent_30rem),linear-gradient(180deg,rgba(5,7,13,0.02),rgba(5,7,13,0.58))]"
        aria-hidden="true"
      />

      <BuilderGlobe
        globeRef={globeRef}
        memories={ATLAS_MEMORIES}
        highlightedCountry={selectedCountry}
        onCountryClick={setSelectedCountry}
        onCountryHover={setHoveredCountry}
      />

      <header className="pointer-events-auto fixed inset-x-0 top-0 z-30">
        <nav className="mx-auto flex min-h-16 w-full max-w-[92rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 backdrop-blur-md transition-colors duration-100 hover:bg-white/[0.06] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b4fe] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070d]"
          >
            <span className="atlas-logo-mark" aria-hidden="true" />
            <span className="text-base font-black lowercase tracking-tight text-white">atlas</span>
          </Link>
          <SolanaWalletButton />
        </nav>
      </header>

      <section className="pointer-events-none fixed left-4 top-24 z-20 max-w-[18rem] sm:left-6 lg:left-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d8b4fe]/74">Atlas globe</p>
        <h1 className="atlas-display mt-3 text-3xl leading-none text-white sm:text-4xl">Memory orbit</h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/54">Night earth, live memory points, quiet routes.</p>
      </section>

      <aside className="pointer-events-none fixed bottom-5 left-4 right-4 z-20 sm:left-auto sm:right-6 sm:w-[22rem] lg:right-8">
        <div className="rounded-2xl border border-[#d8b4fe]/16 bg-[#05070d]/46 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/46">
              {hoveredCountry ? "hovering" : selectedCountry ? "selected" : "active hubs"}
            </p>
            <p className="font-mono text-xs font-black tabular-nums text-[#d8b4fe]/84">{ATLAS_MEMORIES.length}</p>
          </div>
          <p className="mt-2 text-2xl font-black leading-tight text-white">{hoveredCountry ?? selectedCountry ?? "Global archive"}</p>
          <p className="mt-3 text-sm leading-6 text-white/54">
            {selectedHub
              ? `${selectedHub.count} ${selectedHub.count === 1 ? "memory" : "memories"} · ${selectedHub.kinds.join(" / ")}`
              : "Purple countries contain demo memory points and quiet route arcs."}
          </p>
        </div>
      </aside>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

type Country = {
  code: string;
  name: string;
  flag: string;
  flagImage?: string;
  region: string;
};

type CountryApiRecord = {
  code?: string;
  cca2?: string;
  iso2?: string;
  name?:
    | {
        common?: string;
      }
    | string;
  flag?: string;
  flagImage?: string;
  unicodeFlag?: string;
  region?: string;
};

type SurvivalAnswer = "SAVE" | "GOAL" | "MISS" | "VAR";

const fallbackCountries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", flagImage: "https://flags.restcountries.com/v5/svg/us.svg", region: "Americas" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", flagImage: "https://flags.restcountries.com/v5/svg/my.svg", region: "Asia" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", flagImage: "https://flags.restcountries.com/v5/svg/ar.svg", region: "Americas" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", flagImage: "https://flags.restcountries.com/v5/svg/br.svg", region: "Americas" },
  { code: "FR", name: "France", flag: "🇫🇷", flagImage: "https://flags.restcountries.com/v5/svg/fr.svg", region: "Europe" },
  { code: "JP", name: "Japan", flag: "🇯🇵", flagImage: "https://flags.restcountries.com/v5/svg/jp.svg", region: "Asia" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", flagImage: "https://flags.restcountries.com/v5/svg/ma.svg", region: "Africa" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", flagImage: "https://flags.restcountries.com/v5/svg/gb.svg", region: "Europe" },
  { code: "DE", name: "Germany", flag: "🇩🇪", flagImage: "https://flags.restcountries.com/v5/svg/de.svg", region: "Europe" },
  { code: "ES", name: "Spain", flag: "🇪🇸", flagImage: "https://flags.restcountries.com/v5/svg/es.svg", region: "Europe" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", flagImage: "https://flags.restcountries.com/v5/svg/mx.svg", region: "Americas" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", flagImage: "https://flags.restcountries.com/v5/svg/kr.svg", region: "Asia" },
];

const answerOptions: SurvivalAnswer[] = ["SAVE", "GOAL", "MISS", "VAR"];

const demoTimeline = [
  ["Kickoff", "1,000 fans enter"],
  ["Corner", "72% eliminated"],
  ["VAR", "80% more gone"],
  ["Penalty", "14 survivors"],
  ["Final", "Badges minted"],
];

const proofItems = [
  "Wallet entry, no account friction",
  "Answers timestamped before outcomes",
  "TxLINE verifies live and finalised events",
  "Survivor badge settles on Solana devnet",
];

function iso2ToFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";

  return String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0)));
}

function normalizeCountries(payload: unknown): Country[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { countries?: unknown[] })?.countries)
      ? (payload as { countries: unknown[] }).countries
      : Array.isArray((payload as { data?: unknown[] })?.data)
        ? (payload as { data: unknown[] }).data
        : [];

  if (records.length === 0) return fallbackCountries;

  const countries = records
    .filter((record): record is CountryApiRecord => {
      return typeof record === "object" && record !== null;
    })
    .map((record) => {
      const name = typeof record.name === "string" ? record.name : record.name?.common;
      const code = record.code ?? record.iso2 ?? record.cca2 ?? name?.slice(0, 2).toUpperCase() ?? "XX";

      return {
        code,
        name: name ?? "Unknown country",
        flag: record.unicodeFlag || record.flag || iso2ToFlag(code),
        flagImage: record.flagImage,
        region: record.region ?? "Global",
      };
    })
    .filter((country) => country.name !== "Unknown country")
    .sort((a, b) => a.name.localeCompare(b.name));

  return countries.length > 0 ? countries : fallbackCountries;
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <section
      aria-label="Loading"
      aria-busy="true"
      className={`loadscreen fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden px-6 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out ${
        progress >= 100 ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="loadscreen-data loadscreen-data-left" aria-hidden="true" />
      <div className="loadscreen-data loadscreen-data-left-low" aria-hidden="true" />
      <div className="loadscreen-data loadscreen-data-right" aria-hidden="true" />
      <div className="loadscreen-data loadscreen-data-right-low" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl text-center">
        <p className="loadscreen-title text-sm font-bold uppercase text-white sm:text-base">
          Loading Last Fan Standing
        </p>
        <div
          className="loadscreen-bar mt-4 h-6 overflow-hidden rounded-md border border-slate-500/80 bg-slate-950/70 p-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="loadscreen-bar-fill h-full rounded-sm" style={{ width: `${progress}%` }} />
        </div>
        <p className="loadscreen-percent mt-4 font-mono text-lg font-bold text-cyan-100">
          {progress}%
        </p>
      </div>
    </section>
  );
}

function CountryPicker({
  countries,
  onSelect,
}: {
  countries: Country[];
  onSelect: (country: Country) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickedIndex, setPickedIndex] = useState(0);
  const [failedFlagCodes, setFailedFlagCodes] = useState<string[]>([]);
  const activeCountry = countries[activeIndex] ?? fallbackCountries[0];
  const pickedCountry = countries[pickedIndex] ?? activeCountry;
  const canShowFlagImage = Boolean(activeCountry.flagImage && !failedFlagCodes.includes(activeCountry.code));

  function moveCountry(direction: "previous" | "next") {
    setActiveIndex((current) => {
      const nextIndex =
        direction === "previous"
          ? (current - 1 + countries.length) % countries.length
          : (current + 1) % countries.length;
      setPickedIndex(nextIndex);
      return nextIndex;
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="site-backdrop" aria-hidden="true" />
      <section className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl rounded-[1.75rem] border border-slate-800 bg-slate-950/90 p-6 text-center shadow-2xl shadow-cyan-950/30 sm:p-10">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Who do you support?</h1>
          <div className="mt-10 flex items-center justify-between gap-4 sm:gap-8">
            <button
              type="button"
              onClick={() => moveCountry("previous")}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-3xl font-medium text-slate-100 motion-safe:transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:h-20 sm:w-20"
              aria-label="Previous country"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPickedIndex(activeIndex)}
              className={`country-flag-button flex h-60 w-60 shrink-0 items-center justify-center rounded-full border motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:h-80 sm:w-80 ${
                pickedIndex === activeIndex
                  ? "border-cyan-300 bg-cyan-300/10"
                  : "border-slate-800 bg-slate-900"
              }`}
              aria-label={`Select ${activeCountry.name}`}
            >
              {canShowFlagImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeCountry.flagImage}
                  alt=""
                  className="country-flag-art"
                  onError={() => {
                    setFailedFlagCodes((codes) =>
                      codes.includes(activeCountry.code) ? codes : [...codes, activeCountry.code],
                    );
                  }}
                />
              ) : (
                <span className="country-flag-emoji" aria-hidden="true">
                  {activeCountry.flag}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => moveCountry("next")}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-3xl font-medium text-slate-100 motion-safe:transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:h-20 sm:w-20"
              aria-label="Next country"
            >
              →
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSelect(pickedCountry)}
            className="mt-10 min-h-20 w-full rounded-xl bg-cyan-500 px-5 text-2xl font-medium text-white motion-safe:transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Pick
          </button>
        </div>
      </section>
    </main>
  );
}

function StadiumVisual() {
  const dots = Array.from({ length: 154 }, (_, index) => {
    const status = index % 11 === 0 ? "dead" : index % 17 === 0 ? "ghost" : "alive";
    return status;
  });

  return (
    <div className="stadium-card relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-cyan-200">Argentina 1 — 1 France</p>
          <p className="mt-1 font-mono text-sm font-bold text-white">76:14 LIVE</p>
        </div>
        <div className="rounded-full bg-rose-400/12 px-3 py-1 text-xs font-bold text-rose-100 ring-1 ring-rose-300/30">
          Round 12
        </div>
      </div>

      <div className="stadium-bowl mt-5">
        <div className="fan-grid" aria-hidden="true">
          {dots.map((status, index) => (
            <span key={`${status}-${index}`} className={`fan-dot fan-dot-${status}`} />
          ))}
        </div>
        <div className="pitch">
          <div className="pitch-line" />
          <div className="survivor-platform">
            <span>🇦🇷</span>
            <span>🇫🇷</span>
            <span>🇧🇷</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["18,402", "fans alive"],
          ["09s", "next event"],
          ["0.2%", "round survival"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <p className="font-mono text-2xl font-bold tabular-nums text-white">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurvivalRound() {
  const [selectedAnswer, setSelectedAnswer] = useState<SurvivalAnswer | null>("VAR");

  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-cyan-200">Survival round #12</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Dangerous free kick detected.</h2>
        </div>
        <div className="rounded-lg bg-slate-950/80 px-3 py-2 text-right">
          <p className="font-mono text-xl font-bold text-white">12s</p>
          <p className="text-xs text-slate-500">to lock</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        TxLINE pauses the room. Pick the outcome before the real event lands.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {answerOptions.map((answer) => (
          <button
            key={answer}
            type="button"
            onClick={() => setSelectedAnswer(answer)}
            className={`min-h-14 rounded-lg border px-4 text-sm font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              selectedAnswer === answer
                ? "border-cyan-300 bg-cyan-300 text-slate-950"
                : "border-slate-700 bg-slate-950/70 text-slate-100 hover:border-cyan-300/50"
            }`}
          >
            {answer}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-300">Survival line</span>
          <span className="font-mono font-bold text-cyan-100">48,291 → 18,402</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-[38%] rounded-full bg-cyan-300" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [showLoadscreen, setShowLoadscreen] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [countries, setCountries] = useState<Country[]>(fallbackCountries);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setLoadProgress((value) => {
        if (value >= 100) return 100;
        return Math.min(value + 5, 100);
      });
    }, 90);

    return () => {
      window.clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    if (loadProgress < 100) return;

    const timer = window.setTimeout(() => {
      setShowLoadscreen(false);
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProgress]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch("/api/countries", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Country API did not respond.");
        const payload = await response.json();
        if (cancelled) return;
        setCountries(normalizeCountries(payload));
      } catch {
        if (cancelled) return;
        setCountries(fallbackCountries);
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!showLoadscreen && !selectedCountry) {
    return <CountryPicker countries={countries} onSelect={setSelectedCountry} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {showLoadscreen ? <LoadingScreen progress={loadProgress} /> : null}

      <div className="site-backdrop" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-300/35 bg-cyan-300/10 text-sm font-bold text-cyan-100">
              LFS
            </div>
            <div>
              <p className="text-base font-semibold text-white">Last Fan Standing</p>
              <p className="text-sm text-slate-400">
                {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "World Cup survival rooms"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCountry(null)}
              className="min-h-10 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 motion-safe:transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Change country
            </button>
            <a
              href="#demo"
              className="inline-flex min-h-10 items-center rounded-md bg-cyan-400 px-4 text-sm font-bold text-slate-950 motion-safe:transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Watch demo
            </a>
          </div>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-cyan-200">World Cup battle royale</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] text-white sm:text-7xl">
              LAST FAN STANDING
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Every important World Cup moment becomes a survival decision. Read the live event,
              lock your answer, and stay alive while the stadium disappears around you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/survival"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-cyan-400 px-5 text-sm font-bold text-slate-950 motion-safe:transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Enter survival round
              </a>
              <a
                href="#proof"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-5 text-sm font-bold text-slate-100 motion-safe:transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                See proof layer
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["104", "World Cup matches"],
                ["12s", "decision windows"],
                ["1", "fan standing"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <p className="font-mono text-3xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <StadiumVisual />
        </section>

        <section id="round" className="grid gap-5 py-8 lg:grid-cols-[1fr_0.85fr]">
          <SurvivalRound />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-bold uppercase text-cyan-200">Ghost mode</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Eliminated does not mean gone.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Wrong answers turn fans into ghosts. Ghosts keep predicting the next round and earn
              Revive Shards when they are right. Three shards unlock a future second life.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[1, 2, 3].map((shard) => (
                <div key={shard} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-center">
                  <p className="text-3xl font-black text-cyan-100">{shard}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-400">Shard</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="grid gap-5 py-8 lg:grid-cols-[0.8fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-bold uppercase text-cyan-200">Why Solana matters</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Survival needs receipts.</h2>
            <div className="mt-5 space-y-3">
              {proofItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" aria-hidden="true" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div id="demo" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-bold uppercase text-cyan-200">Replay demo</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Three minutes. One legendary match.</h2>
            <div className="mt-6 grid gap-3">
              {demoTimeline.map(([step, detail], index) => (
                <div key={step} className="grid grid-cols-[3rem_1fr] gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-300 text-sm font-black text-slate-950">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-white">{step}</p>
                    <p className="mt-1 text-sm text-slate-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6 text-center">
            <p className="text-3xl font-black text-white sm:text-5xl">
              104 matches. One question: can you survive the World Cup?
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

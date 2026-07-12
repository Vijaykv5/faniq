"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoadState = "idle" | "loading" | "success" | "error";
type SurvivalAnswer = "SAVE" | "GOAL" | "MISS" | "VAR";

type Fixture = {
  id: string;
  home: string;
  away: string;
  competition: string;
  status: string;
  startTime?: number;
  startLabel: string;
};

type Signal = {
  title: string;
  detail: string;
  endpoint: string;
  options: SurvivalAnswer[];
};

const fallbackFixtures: Fixture[] = [
  {
    id: "1001",
    home: "Argentina",
    away: "France",
    competition: "World Cup Replay",
    status: "Replay ready",
    startLabel: "Replay",
  },
  {
    id: "1002",
    home: "Brazil",
    away: "Germany",
    competition: "World Cup Replay",
    status: "Replay ready",
    startLabel: "Replay",
  },
  {
    id: "1003",
    home: "Japan",
    away: "Spain",
    competition: "World Cup Replay",
    status: "Replay ready",
    startLabel: "Replay",
  },
];

const MS_PER_DAY = 86_400_000;
const GAME_STATE_LABELS: Record<string, string> = {
  "1": "Not started",
  "2": "First half",
  "3": "Half time",
  "4": "Second half",
  "5": "Full time",
  "6": "Extra time pending",
  "7": "Extra time first half",
  "8": "Extra time half time",
  "9": "Extra time second half",
  "10": "Full time extra time",
  "11": "Penalties pending",
  "12": "Penalties",
  "13": "Full time penalties",
};

const fallbackSignals: Signal[] = [
  {
    title: "Dangerous free kick",
    detail: "TxLINE score feed marks an attacking action near goal. Lock your read before the outcome lands.",
    endpoint: "/scores/updates/:fixtureId",
    options: ["SAVE", "GOAL", "MISS", "VAR"],
  },
  {
    title: "Corner pressure",
    detail: "Odds and score pressure rise together. The room has twelve seconds to survive the next touch.",
    endpoint: "/odds/updates/:fixtureId",
    options: ["SAVE", "GOAL", "MISS", "VAR"],
  },
  {
    title: "VAR check",
    detail: "The score stream pauses around a reviewable action. Correct answers stay alive.",
    endpoint: "/scores/snapshot/:fixtureId",
    options: ["VAR", "GOAL", "MISS", "SAVE"],
  },
];

function readText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function todayEpochDay() {
  return Math.floor(Date.now() / MS_PER_DAY);
}

function formatKickoff(startTime?: number) {
  if (!startTime) return "Kickoff TBA";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startTime));
}

function gameStateLabel(record: Record<string, unknown>) {
  const rawState = readText(record, ["GameState", "gameState", "status", "fixtureStatus", "state", "phase"], "");
  return GAME_STATE_LABELS[rawState] ?? (rawState || "TxLINE fixture");
}

function isWorldCupFixture(fixture: Fixture) {
  return /world cup|fifa/i.test(fixture.competition);
}

function normalizeFixtures(payload: unknown): Fixture[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : [];

  const now = Date.now();
  const normalized = records
    .filter((record): record is Record<string, unknown> => typeof record === "object" && record !== null)
    .map((record, index) => {
      const id = readText(record, ["FixtureId", "fixtureId", "id", "eventId", "matchId"], `${index + 1}`);
      const startTime = readNumber(record, ["StartTime", "startTime", "startTimestamp", "kickoff", "ts"]);

      return {
        id,
        home: readText(record, ["Participant1", "participant1", "homeTeam", "home", "homeName", "team1"], "Home"),
        away: readText(record, ["Participant2", "participant2", "awayTeam", "away", "awayName", "team2"], "Away"),
        competition: readText(record, ["Competition", "competitionName", "competition", "leagueName", "tournament"], "World Cup"),
        status: gameStateLabel(record),
        startTime,
        startLabel: formatKickoff(startTime),
      };
    })
    .filter((fixture) => {
      const hasTeams = fixture.home !== "Home" && fixture.away !== "Away";
      const isFuture = !fixture.startTime || fixture.startTime >= now;
      return hasTeams && isFuture;
    })
    .sort((fixtureA, fixtureB) => (fixtureA.startTime ?? Number.MAX_SAFE_INTEGER) - (fixtureB.startTime ?? Number.MAX_SAFE_INTEGER));

  const worldCupFixtures = normalized.filter(isWorldCupFixture);
  return (worldCupFixtures.length > 0 ? worldCupFixtures : normalized).slice(0, 10);
}

function countRecords(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray((payload as { data?: unknown[] })?.data)) {
    return (payload as { data: unknown[] }).data.length;
  }
  return 0;
}

function signalFromPayload(scorePayload: unknown, oddsPayload: unknown, fixtureId: string): Signal {
  const scoreCount = countRecords(scorePayload);
  const oddsCount = countRecords(oddsPayload);

  if (scoreCount > 0) {
    return {
      title: "Live score action",
      detail: `${scoreCount} score records are available from TxLINE. The next survival window is score-driven.`,
      endpoint: `/scores/snapshot/${fixtureId}`,
      options: ["SAVE", "GOAL", "MISS", "VAR"],
    };
  }

  if (oddsCount > 0) {
    return {
      title: "Market pressure spike",
      detail: `${oddsCount} odds records are available from TxLINE. The room is reading pressure before the outcome.`,
      endpoint: `/odds/snapshot/${fixtureId}`,
      options: ["GOAL", "SAVE", "VAR", "MISS"],
    };
  }

  return fallbackSignals[0];
}

function FanDots() {
  return (
    <div className="survival-stands" aria-hidden="true">
      {Array.from({ length: 220 }, (_, index) => {
        const status = index % 9 === 0 ? "out" : index % 19 === 0 ? "ghost" : "alive";
        return <span key={`${status}-${index}`} className={`survival-dot survival-dot-${status}`} />;
      })}
    </div>
  );
}

export default function SurvivalPage() {
  const [fixtureState, setFixtureState] = useState<LoadState>("idle");
  const [fixtures, setFixtures] = useState<Fixture[]>(fallbackFixtures);
  const [selectedFixtureId, setSelectedFixtureId] = useState(fallbackFixtures[0].id);
  const [roomState, setRoomState] = useState<LoadState>("idle");
  const [roomError, setRoomError] = useState("");
  const [signal, setSignal] = useState<Signal>(fallbackSignals[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<SurvivalAnswer | null>(null);
  const [alive, setAlive] = useState(48291);
  const [round, setRound] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadFixtures() {
      setFixtureState("loading");

      try {
        const response = await fetch(`/api/txline/data/fixtures/snapshot?startEpochDay=${todayEpochDay()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("TxLINE fixtures are unavailable.");
        const payload = await response.json();
        if (cancelled) return;
        const nextFixtures = normalizeFixtures(payload);
        if (nextFixtures.length > 0) {
          setFixtures(nextFixtures);
          setSelectedFixtureId(nextFixtures[0].id);
        }
        setFixtureState("success");
      } catch {
        if (cancelled) return;
        setFixtures(fallbackFixtures);
        setFixtureState("error");
      }
    }

    loadFixtures();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      setRoomState("loading");
      setRoomError("");
      setSelectedAnswer(null);

      try {
        const [scoreResponse, oddsResponse] = await Promise.all([
          fetch(`/api/txline/data/scores/snapshot/${selectedFixtureId}`, { cache: "no-store" }),
          fetch(`/api/txline/data/odds/snapshot/${selectedFixtureId}`, { cache: "no-store" }),
        ]);

        const scorePayload = scoreResponse.ok ? await scoreResponse.json() : [];
        const oddsPayload = oddsResponse.ok ? await oddsResponse.json() : [];
        if (cancelled) return;

        setSignal(signalFromPayload(scorePayload, oddsPayload, selectedFixtureId));
        setRoomState("success");
      } catch (error) {
        if (cancelled) return;
        setSignal(fallbackSignals[round % fallbackSignals.length]);
        setRoomState("error");
        setRoomError(error instanceof Error ? error.message : "Could not load live TxLINE room.");
      }
    }

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [round, selectedFixtureId]);

  const selectedFixture = useMemo(() => {
    return fixtures.find((fixture) => fixture.id === selectedFixtureId) ?? fixtures[0];
  }, [fixtures, selectedFixtureId]);

  function lockAnswer(answer: SurvivalAnswer) {
    setSelectedAnswer(answer);
    setAlive((value) => Math.max(43, Math.floor(value * (answer === "VAR" ? 0.38 : 0.57))));
  }

  function nextRound() {
    setRound((value) => value + 1);
    setAlive((value) => Math.max(43, value - Math.floor(value * 0.17)));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="site-backdrop" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-bold uppercase text-cyan-200 motion-safe:transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              ← Last Fan Standing
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Survival room</h1>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">TxLINE status</p>
            <p className="mt-1 text-sm font-bold text-cyan-100">
              {roomState === "loading" ? "Syncing live data" : roomState === "error" ? "Replay fallback" : "Live room ready"}
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Choose match</h2>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300">
                  {fixtureState === "loading" ? "..." : fixtures.length}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {fixtures.map((fixture) => (
                  <button
                    key={fixture.id}
                    type="button"
                    onClick={() => {
                      setSelectedFixtureId(fixture.id);
                      setRound(1);
                      setAlive(48291);
                    }}
                    className={`w-full rounded-lg border p-3 text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      selectedFixtureId === fixture.id
                        ? "border-cyan-300 bg-cyan-300 text-slate-950"
                        : "border-slate-800 bg-slate-950/60 text-slate-100 hover:border-cyan-300/50"
                    }`}
                  >
                    <span className="block text-sm font-black">
                      {fixture.home} vs {fixture.away}
                    </span>
                    <span className="mt-1 block text-xs opacity-75">
                      {fixture.startLabel} · {fixture.competition}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold uppercase opacity-60">{fixture.status}</span>
                  </button>
                ))}
              </div>
              {fixtureState === "error" ? (
                <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                  Live fixtures failed, so replay matches are available.
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-lg font-bold text-white">Room metrics</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  [String(round), "round"],
                  [alive.toLocaleString(), "alive"],
                  ["12s", "lock"],
                  ["3", "shards"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-mono text-2xl font-black tabular-nums text-white">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-cyan-200">{selectedFixture.competition}</p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {selectedFixture.home} vs {selectedFixture.away}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {selectedFixture.startLabel} kickoff. Every fan gets one life. Wrong answer means ghost mode.
                </p>
              </div>
              <button
                type="button"
                onClick={nextRound}
                className="min-h-11 rounded-md bg-cyan-400 px-5 text-sm font-black text-slate-950 motion-safe:transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Next event
              </button>
            </div>

            <div className="survival-arena mt-5">
              <FanDots />
              <div className="survival-pitch">
                <p className="text-xs font-black uppercase text-cyan-200">Live survival round</p>
                <p className="mt-2 text-2xl font-black text-white">{signal.title}</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{signal.detail}</p>
                <p className="mt-4 rounded-md bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-400">
                  {signal.endpoint}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {signal.options.map((answer) => (
                <button
                  key={answer}
                  type="button"
                  onClick={() => lockAnswer(answer)}
                  className={`min-h-16 rounded-lg border px-4 text-sm font-black motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    selectedAnswer === answer
                      ? "border-cyan-300 bg-cyan-300 text-slate-950"
                      : "border-slate-700 bg-slate-950/70 text-slate-100 hover:border-cyan-300/50"
                  }`}
                >
                  {answer}
                </button>
              ))}
            </div>

            {roomError ? (
              <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                {roomError} Showing replay-safe survival prompts.
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

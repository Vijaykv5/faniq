"use client";

import { useEffect, useState } from "react";

type FifaScore = {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  competition: string;
  startTime?: number;
};

type ScoreResponse = {
  scores?: FifaScore[];
  error?: string;
};

function scoreLabel(score: FifaScore) {
  if (score.homeScore === null || score.awayScore === null) return "";
  return `${score.homeScore} : ${score.awayScore}`;
}

const TEAM_FLAGS: Record<string, string> = {
  argentina: "🇦🇷",
  australia: "🇦🇺",
  belgium: "🇧🇪",
  "bosnia & herzegovina": "🇧🇦",
  brazil: "🇧🇷",
  canada: "🇨🇦",
  "cape verde": "🇨🇻",
  colombia: "🇨🇴",
  "congo dr": "🇨🇩",
  croatia: "🇭🇷",
  denmark: "🇩🇰",
  ecuador: "🇪🇨",
  egypt: "🇪🇬",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  france: "🇫🇷",
  germany: "🇩🇪",
  ghana: "🇬🇭",
  iran: "🇮🇷",
  japan: "🇯🇵",
  mexico: "🇲🇽",
  morocco: "🇲🇦",
  netherlands: "🇳🇱",
  norway: "🇳🇴",
  paraguay: "🇵🇾",
  poland: "🇵🇱",
  portugal: "🇵🇹",
  qatar: "🇶🇦",
  "saudi arabia": "🇸🇦",
  senegal: "🇸🇳",
  serbia: "🇷🇸",
  spain: "🇪🇸",
  switzerland: "🇨🇭",
  tunisia: "🇹🇳",
  uruguay: "🇺🇾",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

function teamFlag(team: string) {
  const normalizedTeam = team.trim().toLowerCase();
  return TEAM_FLAGS[normalizedTeam] ?? "⚽";
}

export function FifaScoreStrip() {
  const [scores, setScores] = useState<FifaScore[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadScores() {
      try {
        const response = await fetch("/api/txline/fifa-scores?days=10&limit=8", {
          cache: "no-store",
        });
        const payload = (await response.json()) as ScoreResponse;
        if (cancelled) return;

        if (!response.ok || !payload.scores) throw new Error(payload.error ?? "Could not load scores.");

        setScores(payload.scores);
        setState("success");
      } catch {
        if (cancelled) return;
        setScores([]);
        setState("error");
      }
    }

    loadScores();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleScores = scores.length > 0 && scores.length < 6 ? [...scores, ...scores, ...scores] : scores;

  function renderScore(score: FifaScore, index: number, group: string) {
    return (
      <span
        key={`${group}-${score.id}-${index}`}
        className="score-match"
        aria-label={`${score.home} versus ${score.away}, ${scoreLabel(score)}`}
      >
        <span className="score-flag" aria-hidden="true">
          {teamFlag(score.home)}
        </span>
        <span className="score-value">{scoreLabel(score)}</span>
        <span className="score-flag" aria-hidden="true">
          {teamFlag(score.away)}
        </span>
      </span>
    );
  }

  return (
    <section className="score-strip" aria-label="Previous FIFA match scores">
      <div className="score-strip-inner">
        <div className="score-strip-track">
          {state === "error" ? (
            <span className="score-match score-match-muted">TxLINE scores unavailable</span>
          ) : null}
          {state === "success" && scores.length === 0 ? (
            <span className="score-match score-match-muted">No recent FIFA match scores found</span>
          ) : null}
          {visibleScores.length > 0 ? (
            <div
              className="score-marquee score-marquee-moving transform-gpu motion-safe:animate-[score-marquee-slide_18s_linear_infinite]"
              aria-live="polite"
            >
              <div className="score-marquee-group">{visibleScores.map((score, index) => renderScore(score, index, "a"))}</div>
              <div className="score-marquee-group" aria-hidden="true">
                {visibleScores.map((score, index) => renderScore(score, index, "b"))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

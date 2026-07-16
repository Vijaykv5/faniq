import { NextResponse } from "next/server";
import { createTxLineClient, TxLineApiError } from "@/lib/txline";

type TxLineRecord = Record<string, unknown>;

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

const MS_PER_DAY = 86_400_000;
const HISTORICAL_SCORE_MIN_AGE_MS = 6 * 60 * 60 * 1000;
const HISTORICAL_SCORE_MAX_AGE_MS = 14 * MS_PER_DAY;

const HOME_SCORE_KEYS = [
  "Participant1Score",
  "participant1Score",
  "HomeScore",
  "homeScore",
  "home_score",
  "Score1",
  "score1",
  "Team1Score",
  "team1Score",
  "GoalsParticipant1",
];

const AWAY_SCORE_KEYS = [
  "Participant2Score",
  "participant2Score",
  "AwayScore",
  "awayScore",
  "away_score",
  "Score2",
  "score2",
  "Team2Score",
  "team2Score",
  "GoalsParticipant2",
];

function readText(record: TxLineRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function readNumber(record: TxLineRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function readNestedNumber(value: unknown, path: string[]) {
  let currentValue = value;

  for (const key of path) {
    if (typeof currentValue !== "object" || currentValue === null) return undefined;
    currentValue = (currentValue as Record<string, unknown>)[key];
  }

  if (typeof currentValue === "number" && Number.isFinite(currentValue)) return currentValue;
  if (typeof currentValue === "string" && currentValue.trim()) {
    const parsed = Number(currentValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function readTime(record: TxLineRecord) {
  const rawTime = readNumber(record, ["StartTime", "startTime", "startTimestamp", "kickoff", "ts", "Timestamp", "timestamp"]);
  if (!rawTime) return undefined;

  return rawTime < 10_000_000_000 ? rawTime * 1000 : rawTime;
}

function readEventTime(record: TxLineRecord) {
  const rawTime = readNumber(record, ["Ts", "ts", "Timestamp", "timestamp", "StartTime", "startTime"]);
  if (!rawTime) return undefined;

  return rawTime < 10_000_000_000 ? rawTime * 1000 : rawTime;
}

function recordsFromPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload.filter((record): record is TxLineRecord => typeof record === "object" && record !== null);

  if (typeof payload === "string") {
    return payload
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((record): record is TxLineRecord => typeof record === "object" && record !== null);
  }

  if (typeof payload === "object" && payload !== null) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return recordsFromPayload(data);
  }

  return [];
}

function scoreFromRecord(record: TxLineRecord) {
  const soccerScore = record.scoreSoccer ?? record.ScoreSoccer ?? record.Score ?? record.score;
  const homeScore =
    readNestedNumber(soccerScore, ["Participant1", "Total", "Goals"]) ??
    readNestedNumber(soccerScore, ["participant1", "total", "goals"]) ??
    readNumber(record, HOME_SCORE_KEYS);
  const awayScore =
    readNestedNumber(soccerScore, ["Participant2", "Total", "Goals"]) ??
    readNestedNumber(soccerScore, ["participant2", "total", "goals"]) ??
    readNumber(record, AWAY_SCORE_KEYS);

  if (homeScore === undefined || awayScore === undefined) return null;

  return {
    homeScore,
    awayScore,
  };
}

function latestScore(records: TxLineRecord[]) {
  const sortedRecords = [...records].sort((recordA, recordB) => (readEventTime(recordB) ?? 0) - (readEventTime(recordA) ?? 0));

  for (const record of sortedRecords) {
    const score = scoreFromRecord(record);
    if (score) return score;
  }

  return null;
}

function normalizeFixture(record: TxLineRecord): FifaScore | null {
  const id = readText(record, ["FixtureId", "fixtureId", "id", "eventId", "matchId"]);
  const home = readText(record, ["Participant1", "participant1", "homeTeam", "home", "homeName", "team1"]);
  const away = readText(record, ["Participant2", "participant2", "awayTeam", "away", "awayName", "team2"]);
  const competition = readText(record, ["Competition", "competitionName", "competition", "leagueName", "tournament"], "FIFA");

  if (!id || !home || !away) return null;
  if (!/fifa|world cup/i.test(competition)) return null;

  const fixtureScore = scoreFromRecord(record);

  return {
    id,
    home,
    away,
    homeScore: fixtureScore?.homeScore ?? null,
    awayScore: fixtureScore?.awayScore ?? null,
    status: readText(record, ["GameState", "gameState", "status", "fixtureStatus", "state", "phase"], "FT"),
    competition,
    startTime: readTime(record),
  };
}

function dedupeFixtures(fixtures: FifaScore[]) {
  const fixtureMap = new Map<string, FifaScore>();

  for (const fixture of fixtures) {
    const existingFixture = fixtureMap.get(fixture.id);
    if (!existingFixture) {
      fixtureMap.set(fixture.id, fixture);
      continue;
    }

    const existingHasScore = existingFixture.homeScore !== null && existingFixture.awayScore !== null;
    const nextHasScore = fixture.homeScore !== null && fixture.awayScore !== null;
    const nextIsNewer = (fixture.startTime ?? 0) > (existingFixture.startTime ?? 0);

    if ((!existingHasScore && nextHasScore) || nextIsNewer) {
      fixtureMap.set(fixture.id, {
        ...existingFixture,
        ...fixture,
      });
    }
  }

  return Array.from(fixtureMap.values());
}

async function fetchFixtureScores(client: ReturnType<typeof createTxLineClient>, fixture: FifaScore) {
  if (fixture.homeScore !== null && fixture.awayScore !== null) return fixture;

  try {
    const historicalScores = await client.request<unknown>(`/scores/historical/${fixture.id}`);
    const score = latestScore(recordsFromPayload(historicalScores));
    if (score) {
      return {
        ...fixture,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
      };
    }
  } catch {
    // Some fixtures only expose snapshots. Fall through to the snapshot endpoint.
  }

  try {
    const snapshotScores = await client.request<unknown>(`/scores/snapshot/${fixture.id}`);
    const score = latestScore(recordsFromPayload(snapshotScores));
    if (score) {
      return {
        ...fixture,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
      };
    }
  } catch {
    return fixture;
  }

  return fixture;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days") ?? 10), 20);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 8), 12);
  const todayEpochDay = Math.floor(Date.now() / MS_PER_DAY);
  const now = Date.now();
  const latestHistoricalStart = now - HISTORICAL_SCORE_MIN_AGE_MS;
  const earliestHistoricalStart = now - HISTORICAL_SCORE_MAX_AGE_MS;
  const client = createTxLineClient();

  try {
    const fixtureResponses = await Promise.all(
      Array.from({ length: days }, (_, index) => {
        const startEpochDay = todayEpochDay - index;
        return client
          .request<TxLineRecord[]>("/fixtures/snapshot", {
            query: { startEpochDay },
          })
          .catch(() => []);
      }),
    );

    const fixtures = dedupeFixtures(
      fixtureResponses
        .flat()
        .filter((record): record is TxLineRecord => typeof record === "object" && record !== null)
        .map(normalizeFixture)
        .filter((fixture): fixture is FifaScore => Boolean(fixture))
        .filter((fixture) => {
          if (!fixture.startTime) return true;
          return fixture.startTime >= earliestHistoricalStart && fixture.startTime <= latestHistoricalStart;
        }),
    )
      .sort((fixtureA, fixtureB) => (fixtureB.startTime ?? 0) - (fixtureA.startTime ?? 0))
      .slice(0, limit * 3);

    const scores = dedupeFixtures(await Promise.all(fixtures.map((fixture) => fetchFixtureScores(client, fixture))))
      .filter((fixture) => fixture.homeScore !== null && fixture.awayScore !== null)
      .slice(0, limit);

    return NextResponse.json({
      scores,
      source: "txline",
    });
  } catch (error) {
    if (error instanceof TxLineApiError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
          body: error.body,
          scores: [],
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load TxLINE FIFA scores.",
        scores: [],
      },
      { status: 502 },
    );
  }
}

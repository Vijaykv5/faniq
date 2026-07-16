import { NextRequest, NextResponse } from "next/server";
import { ensureGameSchema, requireGameDb, toDbLeaderboardEntry } from "@/lib/game-db";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  try {
    const fixtureId = cleanText(request.nextUrl.searchParams.get("fixtureId"), 80);
    if (!fixtureId) return NextResponse.json({ leaderboard: [] });

    await ensureGameSchema();
    const db = requireGameDb();
    const rows = await db`
      select
        coalesce(wallet, 'guest') as wallet,
        coalesce((array_agg(country_name order by created_at desc))[1], 'Global') as country_name,
        coalesce((array_agg(country_flag order by created_at desc))[1], '⚽') as country_flag,
        count(*) filter (where result = 'survived')::int as survived_rounds,
        count(*) filter (where result = 'shard')::int as shard_rounds,
        count(*)::int as total_rounds
      from round_history
      where fixture_id = ${fixtureId}
      group by coalesce(wallet, 'guest')
      order by survived_rounds desc, shard_rounds desc, total_rounds desc
      limit 10
    `;

    return NextResponse.json({ leaderboard: rows.map(toDbLeaderboardEntry) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load leaderboard." },
      { status: 500 },
    );
  }
}

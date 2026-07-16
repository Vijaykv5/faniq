import { NextRequest, NextResponse } from "next/server";
import { ensureGameSchema, requireGameDb, toDbRoundHistory } from "@/lib/game-db";

export const runtime = "nodejs";

type HistoryBody = {
  fixtureId?: string;
  wallet?: string;
  countryName?: string;
  countryFlag?: string;
  round?: number;
  answer?: string;
  correctAnswer?: string;
  result?: string;
  signature?: string;
  proofMode?: string;
};

const validResults = new Set(["pending", "survived", "ghosted", "shard"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  try {
    const fixtureId = cleanText(request.nextUrl.searchParams.get("fixtureId"), 80);
    const wallet = cleanText(request.nextUrl.searchParams.get("wallet"), 80);
    if (!fixtureId || !wallet) return NextResponse.json({ history: [] });

    await ensureGameSchema();
    const db = requireGameDb();
    const rows = await db`
      select id, fixture_id, wallet, country_name, country_flag, round, answer, correct_answer, result, signature, proof_mode, created_at
      from round_history
      where fixture_id = ${fixtureId} and wallet = ${wallet}
      order by created_at desc
      limit 8
    `;

    return NextResponse.json({ history: rows.map(toDbRoundHistory) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load round history." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HistoryBody;
    const fixtureId = cleanText(body.fixtureId, 80);
    const wallet = cleanText(body.wallet, 80) || null;
    const countryName = cleanText(body.countryName, 80) || "Global";
    const countryFlag = cleanText(body.countryFlag, 8) || "⚽";
    const answer = cleanText(body.answer, 12);
    const correctAnswer = cleanText(body.correctAnswer, 12);
    const result = cleanText(body.result, 20);
    const signature = cleanText(body.signature, 220) || null;
    const proofMode = cleanText(body.proofMode, 20) || "onchain";
    const round = Number.isInteger(body.round) ? Number(body.round) : 0;

    if (!fixtureId || !answer || !correctAnswer || !validResults.has(result) || round < 1) {
      return NextResponse.json({ error: "Invalid round history payload." }, { status: 400 });
    }

    await ensureGameSchema();
    const db = requireGameDb();
    const id = crypto.randomUUID();
    const rows = await db`
      insert into round_history (
        id, fixture_id, wallet, country_name, country_flag, round, answer, correct_answer, result, signature, proof_mode
      )
      values (
        ${id}, ${fixtureId}, ${wallet}, ${countryName}, ${countryFlag}, ${round}, ${answer}, ${correctAnswer}, ${result}, ${signature}, ${proofMode}
      )
      returning id, fixture_id, wallet, country_name, country_flag, round, answer, correct_answer, result, signature, proof_mode, created_at
    `;

    return NextResponse.json({ historyItem: toDbRoundHistory(rows[0]) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save round history." },
      { status: 500 },
    );
  }
}

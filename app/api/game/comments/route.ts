import { NextRequest, NextResponse } from "next/server";
import { ensureGameSchema, requireGameDb, toDbComment } from "@/lib/game-db";

export const runtime = "nodejs";

type CommentBody = {
  fixtureId?: string;
  wallet?: string;
  author?: string;
  countryFlag?: string;
  message?: string;
  imageUrl?: string;
  imageName?: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  try {
    const fixtureId = cleanText(request.nextUrl.searchParams.get("fixtureId"), 80);
    if (!fixtureId) return NextResponse.json({ comments: [] });

    await ensureGameSchema();
    const db = requireGameDb();
    const rows = await db`
      select id, fixture_id, wallet, author, country_flag, message, image_url, image_name, created_at
      from fan_comments
      where fixture_id = ${fixtureId}
      order by created_at desc
      limit 30
    `;

    return NextResponse.json({ comments: rows.map(toDbComment) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load fan comments." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommentBody;
    const fixtureId = cleanText(body.fixtureId, 80);
    const wallet = cleanText(body.wallet, 80) || null;
    const author = cleanText(body.author, 40) || "Fan";
    const countryFlag = cleanText(body.countryFlag, 8) || "⚽";
    const message = cleanText(body.message, 280);
    const imageUrl = cleanText(body.imageUrl, 640_000) || null;
    const imageName = cleanText(body.imageName, 120) || null;

    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId." }, { status: 400 });
    }

    if (!message && !imageUrl) {
      return NextResponse.json({ error: "Comment needs text or an image." }, { status: 400 });
    }

    if (imageUrl && !imageUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Only inline image previews are accepted for demo chat." }, { status: 400 });
    }

    await ensureGameSchema();
    const db = requireGameDb();
    const id = crypto.randomUUID();
    const rows = await db`
      insert into fan_comments (id, fixture_id, wallet, author, country_flag, message, image_url, image_name)
      values (${id}, ${fixtureId}, ${wallet}, ${author}, ${countryFlag}, ${message}, ${imageUrl}, ${imageName})
      returning id, fixture_id, wallet, author, country_flag, message, image_url, image_name, created_at
    `;

    return NextResponse.json({ comment: toDbComment(rows[0]) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save fan comment." },
      { status: 500 },
    );
  }
}

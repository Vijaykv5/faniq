import { NextResponse } from "next/server";
import { startGuestSession } from "@/lib/txline";

export async function POST() {
  try {
    const session = await startGuestSession();
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown TxLINE error" },
      { status: 502 },
    );
  }
}

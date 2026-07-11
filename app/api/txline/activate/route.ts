import { NextRequest, NextResponse } from "next/server";
import { activateSubscription } from "@/lib/txline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = await activateSubscription(
      {
        txSig: body.txSig,
        walletSignature: body.walletSignature,
        leagues: body.leagues ?? [],
      },
      {
        guestJwt: body.guestJwt,
      },
    );

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown TxLINE error" },
      { status: 502 },
    );
  }
}

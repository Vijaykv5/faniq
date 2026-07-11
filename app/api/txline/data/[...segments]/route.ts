import { NextRequest, NextResponse } from "next/server";
import { createTxLineClient, TxLineApiError } from "@/lib/txline";

type RouteContext = {
  params: Promise<{
    segments: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { segments } = await context.params;
    const path = `/${segments.join("/")}`;
    const query = Object.fromEntries(request.nextUrl.searchParams);
    const client = createTxLineClient();
    const data = await client.request(path, { query });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TxLineApiError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
          body: error.body,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown TxLINE error" },
      { status: 502 },
    );
  }
}

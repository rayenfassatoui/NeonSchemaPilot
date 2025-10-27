import { NextRequest, NextResponse } from "next/server";

import { describeDatabase, isValidConnectionString } from "@/lib/neon";

interface DescribeRequestBody {
  connectionString?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DescribeRequestBody;
    const connectionString = body.connectionString?.trim();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Missing connection string." },
        { status: 400 }
      );
    }

    if (!isValidConnectionString(connectionString)) {
      return NextResponse.json(
        { error: "Please provide a valid Postgres connection string." },
        { status: 400 }
      );
    }

    const payload = await describeDatabase(connectionString);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to describe database", error);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to reach the provided database.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

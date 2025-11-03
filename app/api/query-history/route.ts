import { NextRequest, NextResponse } from "next/server";
import { getQueryHistoryManager } from "@/lib/query-history";
import type { QueryHistoryFilter } from "@/types/query-history";

export const dynamic = "force-dynamic";

// GET /api/query-history - Get all query history with optional filters
// GET /api/query-history?stats=true - Get statistics
export async function GET(req: NextRequest) {
  try {
    const manager = getQueryHistoryManager();
    const { searchParams } = new URL(req.url);

    // Check if stats are requested
    if (searchParams.get("stats") === "true") {
      const stats = await manager.getStats();
      return NextResponse.json(stats);
    }

    // Build filter from query params
    const filter: QueryHistoryFilter = {};
    
    const operationType = searchParams.get("operationType");
    if (operationType) {
      filter.operationType = operationType as QueryHistoryFilter["operationType"];
    }

    const status = searchParams.get("status");
    if (status) {
      filter.status = status as QueryHistoryFilter["status"];
    }

    const searchTerm = searchParams.get("searchTerm");
    if (searchTerm) {
      filter.searchTerm = searchTerm;
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filter.startDate = startDate;
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filter.endDate = endDate;
    }

    const history = await manager.getAll(filter);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch query history:", error);
    return NextResponse.json(
      { error: "Failed to fetch query history" },
      { status: 500 }
    );
  }
}

// POST /api/query-history - Add a new query history entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const manager = getQueryHistoryManager();
    
    const entry = await manager.addEntry({
      query: body.query,
      operationType: body.operationType,
      status: body.status,
      executionTimeMs: body.executionTimeMs,
      affectedRows: body.affectedRows,
      errorMessage: body.errorMessage,
      tables: body.tables,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to add query history entry:", error);
    return NextResponse.json(
      { error: "Failed to add query history entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/query-history?id=xxx - Delete a specific entry
// DELETE /api/query-history?clear=true - Clear all history
export async function DELETE(req: NextRequest) {
  try {
    const manager = getQueryHistoryManager();
    const { searchParams } = new URL(req.url);

    if (searchParams.get("clear") === "true") {
      await manager.clear();
      return NextResponse.json({ success: true, message: "History cleared" });
    }

    const id = searchParams.get("id");
    if (id) {
      await manager.deleteEntry(id);
      return NextResponse.json({ success: true, message: "Entry deleted" });
    }

    return NextResponse.json(
      { error: "Missing id or clear parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to delete query history:", error);
    return NextResponse.json(
      { error: "Failed to delete query history" },
      { status: 500 }
    );
  }
}

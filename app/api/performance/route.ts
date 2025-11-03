/**
 * Performance Analytics API Route
 * Provides performance metrics, trends, and insights
 * Updated: Connection string encoding fix applied
 */

import { NextRequest, NextResponse } from "next/server";
import { getQueryHistoryManager } from "@/lib/query-history";
import { FileDatabase } from "@/lib/file-db/database";
import { neon } from "@neondatabase/serverless";
import {
    generatePerformanceReport,
    calculateQueryPerformance,
    generateTableStatistics, identifySlowQueries,
    calculatePerformanceTrends
} from "@/lib/performance-utils";
import type { TimeRange } from "@/types/performance";

/**
 * GET /api/performance - Get performance metrics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = (searchParams.get("timeRange") || "24h") as TimeRange;
    const encodedConnectionString = searchParams.get("connectionString");
    const metric = searchParams.get("metric"); // specific metric to fetch

    // Decode the URL-encoded connection string
    const connectionString = encodedConnectionString ? decodeURIComponent(encodedConnectionString) : null;

    // Get query history
    const historyManager = getQueryHistoryManager();
    const queries = await historyManager.getAll();

    // Get table information
    let tables: Array<{ name: string; columnCount: number; rowCount: number }> = [];

    if (connectionString) {
      // Fetch from Neon
      try {
        const sql = neon(connectionString);

        const tablesResult = await sql`
          SELECT 
            table_name as name,
            (SELECT count(*) FROM information_schema.columns 
             WHERE table_name = t.table_name) as column_count
          FROM information_schema.tables t
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `;

        for (const table of tablesResult) {
          // Use raw query for dynamic table names - need to properly escape identifier
          // For now, skip row counts to avoid SQL injection risks with dynamic table names
          tables.push({
            name: table.name,
            columnCount: Number(table.column_count) || 0,
            rowCount: 0, // TODO: Implement safe dynamic table name querying
          });
        }
      } catch (error) {
        console.error("Error fetching Neon tables:", error);
      }
    } else {
      // Fetch from file database
      try {
        const db = new FileDatabase("./data/database.json");
        await db.load();
        const summary = db.getSummary();

        tables = summary.tables.map((t: { name: string; columnCount: number; rowCount: number }) => ({
          name: t.name,
          columnCount: t.columnCount,
          rowCount: t.rowCount,
        }));
      } catch (error) {
        console.error("Error fetching file database tables:", error);
      }
    }

    // Return specific metric if requested
    if (metric) {
      switch (metric) {
        case "query-performance":
          const queryPerf = calculateQueryPerformance(queries);
          return NextResponse.json({ metric: "query-performance", data: queryPerf });

        case "table-statistics":
          const tableStats = generateTableStatistics(queries, tables);
          return NextResponse.json({ metric: "table-statistics", data: tableStats });

        case "slow-queries":
          const slowQueries = identifySlowQueries(queries);
          return NextResponse.json({ metric: "slow-queries", data: slowQueries });

        case "trends":
          const trends = calculatePerformanceTrends(queries, timeRange);
          return NextResponse.json({ metric: "trends", data: trends });

        default:
          return NextResponse.json(
            { error: "Invalid metric type" },
            { status: 400 }
          );
      }
    }

    // Return full report
    const report = generatePerformanceReport(queries, tables, timeRange);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate performance metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

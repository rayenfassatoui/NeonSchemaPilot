import { NextRequest, NextResponse } from "next/server";
import { FileDatabase } from "@/lib/file-db/database";
import {
    groupAndAggregate,
    toChartData,
    generateInsights,
    applyFilters,
    validateChartConfig,
    suggestCharts,
    analyzeTableStructure,
} from "@/lib/chart-utils";
import type { ChartConfig, ChartResponse } from "@/types/charts";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const DB_FILE_PATH = "data/database.json";

// POST /api/charts - Generate chart data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: ChartConfig = body.config;
    const connectionString: string | undefined = body.connectionString;

    // Validate configuration
    const validationError = validateChartConfig(config);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Fetch data
    let tableData: Array<Record<string, unknown>>;
    if (connectionString) {
      tableData = await fetchFromNeon(connectionString, config.tableName);
    } else {
      tableData = await fetchFromFileDB(config.tableName);
    }

    // Apply filters
    const filteredData = applyFilters(tableData, config.filters);

    // Generate chart data
    let dataPoints;
    if (config.groupBy && config.yAxis) {
      dataPoints = groupAndAggregate(
        filteredData,
        config.groupBy,
        config.yAxis.column,
        config.yAxis.aggregation || "count"
      );
    } else {
      // Simple count or single value
      dataPoints = [
        {
          label: config.tableName,
          value: filteredData.length,
        },
      ];
    }

    // Apply limit
    if (config.limit && dataPoints.length > config.limit) {
      dataPoints = dataPoints
        .sort((a, b) => b.value - a.value)
        .slice(0, config.limit);
    }

    const chartData = toChartData(dataPoints, config);
    const insights = generateInsights(dataPoints, config);

    const response: ChartResponse = {
      config,
      data: chartData,
      insights,
      metadata: {
        totalRecords: tableData.length,
        dataPoints: dataPoints.length,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chart generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chart generation failed" },
      { status: 500 }
    );
  }
}

// GET /api/charts?table=xxx&connection=yyy - Get suggested charts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get("table");
    const connectionParam = searchParams.get("connection");

    if (!tableName) {
      return NextResponse.json(
        { error: "Table name is required" },
        { status: 400 }
      );
    }

    let connectionString: string | undefined;
    if (connectionParam) {
      try {
        connectionString = Buffer.from(connectionParam, "base64").toString("utf8");
      } catch (error) {
        console.error("Failed to decode connection string", error);
      }
    }

    // Get table structure
    let columns: Array<{ name: string; dataType: string }>;
    let data: Array<Record<string, unknown>>;

    if (connectionString) {
      const result = await getTableStructureFromNeon(connectionString, tableName);
      columns = result.columns;
      data = result.data;
    } else {
      const result = await getTableStructureFromFileDB(tableName);
      columns = result.columns;
      data = result.data;
    }

    // Analyze structure
    const stats = analyzeTableStructure(columns);
    stats.tableName = tableName;
    stats.rowCount = data.length;

    // Generate suggestions
    const suggestions = suggestCharts(tableName, stats, data);

    return NextResponse.json({
      table: tableName,
      stats,
      suggestions,
    });
  } catch (error) {
    console.error("Failed to generate chart suggestions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

async function fetchFromFileDB(tableName: string): Promise<Array<Record<string, unknown>>> {
  const db = new FileDatabase(DB_FILE_PATH);
  await db.load();

  const result = await db.executeOperation({
    type: "dql.select",
    table: tableName,
  });

  return result.resultSet?.rows || [];
}

async function fetchFromNeon(
  connectionString: string,
  tableName: string
): Promise<Array<Record<string, unknown>>> {
  if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const sql = neon(connectionString, { fullResults: true });
  const query = `SELECT * FROM "${tableName}"`;
  const result = await sql.query(query);

  return result.rows as Array<Record<string, unknown>>;
}

async function getTableStructureFromFileDB(tableName: string): Promise<{
  columns: Array<{ name: string; dataType: string }>;
  data: Array<Record<string, unknown>>;
}> {
  const db = new FileDatabase(DB_FILE_PATH);
  await db.load();

  const summary = db.getSummary();
  const table = summary.tables.find((t) => t.name === tableName);

  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const result = await db.executeOperation({
    type: "dql.select",
    table: tableName,
  });

  return {
    columns: table.columns.map((col) => ({
      name: col.name,
      dataType: col.dataType,
    })),
    data: result.resultSet?.rows || [],
  };
}

async function getTableStructureFromNeon(
  connectionString: string,
  tableName: string
): Promise<{
  columns: Array<{ name: string; dataType: string }>;
  data: Array<Record<string, unknown>>;
}> {
  if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const sql = neon(connectionString, { fullResults: true });

  const columnsQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `;

  const columnsResult = await sql.query(columnsQuery, [tableName]);

  const dataQuery = `SELECT * FROM "${tableName}" LIMIT 1000`;
  const dataResult = await sql.query(dataQuery);

  return {
    columns: (columnsResult.rows as any[]).map((row: any) => ({
      name: row.column_name,
      dataType: row.data_type,
    })),
    data: dataResult.rows as Array<Record<string, unknown>>,
  };
}

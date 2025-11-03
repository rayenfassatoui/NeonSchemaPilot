/**
 * Performance Analytics Utilities
 * Functions for analyzing database performance and generating insights
 */

import type { QueryHistoryEntry } from "@/types/query-history";
import type {
    PerformanceMetrics,
    QueryPerformanceMetrics,
    TableStatistics,
    SystemMetrics,
    SlowQuery,
    PerformanceTrends,
    PerformanceAlert,
    PerformanceReport,
    TimeRange,
    TrendData,
    TableAccessTrend,
    OperationTypeMetrics,
} from "@/types/performance";

/**
 * Calculate query performance metrics from query history
 */
export function calculateQueryPerformance(
  queries: QueryHistoryEntry[]
): QueryPerformanceMetrics {
  if (queries.length === 0) {
    return {
      totalQueries: 0,
      averageExecutionTime: 0,
      medianExecutionTime: 0,
      p95ExecutionTime: 0,
      p99ExecutionTime: 0,
      fastestQuery: 0,
      slowestQuery: 0,
      successRate: 0,
      errorRate: 0,
      queriesPerSecond: 0,
      byOperationType: {
        DDL: createEmptyOperationMetrics(),
        DML: createEmptyOperationMetrics(),
        DQL: createEmptyOperationMetrics(),
        DCL: createEmptyOperationMetrics(),
      },
    };
  }

  const executionTimes = queries
    .map((q) => q.executionTimeMs || 0)
    .filter((time): time is number => time !== undefined)
    .sort((a, b) => a - b);

  const successCount = queries.filter((q) => q.status === "success").length;
  const errorCount = queries.filter((q) => q.status === "error").length;

  // Calculate percentiles
  const median = percentile(executionTimes, 50);
  const p95 = percentile(executionTimes, 95);
  const p99 = percentile(executionTimes, 99);

  // Calculate queries per second
  const timeSpan = getTimeSpan(queries);
  const qps = timeSpan > 0 ? queries.length / timeSpan : 0;

  // Calculate metrics by operation type
  const byOperationType = {
    DDL: calculateOperationTypeMetrics(queries, "DDL"),
    DML: calculateOperationTypeMetrics(queries, "DML"),
    DQL: calculateOperationTypeMetrics(queries, "DQL"),
    DCL: calculateOperationTypeMetrics(queries, "DCL"),
  };

  return {
    totalQueries: queries.length,
    averageExecutionTime: average(executionTimes),
    medianExecutionTime: median,
    p95ExecutionTime: p95,
    p99ExecutionTime: p99,
    fastestQuery: Math.min(...executionTimes),
    slowestQuery: Math.max(...executionTimes),
    successRate: (successCount / queries.length) * 100,
    errorRate: (errorCount / queries.length) * 100,
    queriesPerSecond: qps,
    byOperationType,
  };
}

/**
 * Calculate metrics for a specific operation type
 */
function calculateOperationTypeMetrics(
  queries: QueryHistoryEntry[],
  type: string
): OperationTypeMetrics {
  const filtered = queries.filter((q) => q.operationType === type);

  if (filtered.length === 0) {
    return createEmptyOperationMetrics();
  }

  const totalTime = filtered.reduce((sum, q) => sum + (q.executionTimeMs || 0), 0);
  const successCount = filtered.filter((q) => q.status === "success").length;

  return {
    count: filtered.length,
    averageTime: totalTime / filtered.length,
    totalTime,
    successRate: (successCount / filtered.length) * 100,
  };
}

function createEmptyOperationMetrics(): OperationTypeMetrics {
  return {
    count: 0,
    averageTime: 0,
    totalTime: 0,
    successRate: 0,
  };
}

/**
 * Generate table statistics from query history and schema
 */
export function generateTableStatistics(
  queries: QueryHistoryEntry[],
  tables: Array<{ name: string; columnCount: number; rowCount: number }>
): TableStatistics[] {
  const tableStats = new Map<string, TableStatistics>();

  // Initialize from schema
  tables.forEach((table) => {
    tableStats.set(table.name, {
      tableName: table.name,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      estimatedSize: estimateTableSize(table.rowCount, table.columnCount),
      totalQueries: 0,
      avgQueryTime: 0,
      lastAccessed: "Never",
      mostFrequentOperation: "None",
      readOperations: 0,
      writeOperations: 0,
    });
  });

  // Aggregate query data
  queries.forEach((query) => {
    query.tables?.forEach((tableName) => {
      const stats = tableStats.get(tableName);
      if (!stats) return;

      stats.totalQueries++;
      stats.avgQueryTime =
        (stats.avgQueryTime * (stats.totalQueries - 1) + (query.executionTimeMs || 0)) /
        stats.totalQueries;

      if (!stats.lastAccessed || query.executedAt > stats.lastAccessed) {
        stats.lastAccessed = query.executedAt;
      }

      if (query.operationType === "DQL") {
        stats.readOperations++;
      } else if (["DML", "DDL"].includes(query.operationType)) {
        stats.writeOperations++;
      }
    });
  });

  // Determine most frequent operation
  tableStats.forEach((stats) => {
    if (stats.readOperations > stats.writeOperations) {
      stats.mostFrequentOperation = "Read";
    } else if (stats.writeOperations > stats.readOperations) {
      stats.mostFrequentOperation = "Write";
    } else if (stats.totalQueries > 0) {
      stats.mostFrequentOperation = "Mixed";
    }
  });

  return Array.from(tableStats.values()).sort(
    (a, b) => b.totalQueries - a.totalQueries
  );
}

/**
 * Calculate system-level metrics
 */
export function calculateSystemMetrics(
  queries: QueryHistoryEntry[],
  tables: TableStatistics[]
): SystemMetrics {
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const uptimeSeconds = getTimeSpan(queries);

  return {
    totalTables: tables.length,
    totalRows,
    totalQueries: queries.length,
    uptimeSeconds,
  };
}

/**
 * Identify slow queries based on threshold
 */
export function identifySlowQueries(
  queries: QueryHistoryEntry[],
  threshold: number = 1000
): SlowQuery[] {
  return queries
    .filter((q) => (q.executionTimeMs || 0) > threshold)
    .map((q) => ({
      query: q.query,
      executionTime: q.executionTimeMs || 0,
      timestamp: q.executedAt,
      operationType: q.operationType,
      affectedTables: q.tables || [],
      rowsAffected: q.affectedRows,
    }))
    .sort((a, b) => b.executionTime - a.executionTime)
    .slice(0, 50); // Top 50 slowest
}

/**
 * Calculate performance trends over time
 */
export function calculatePerformanceTrends(
  queries: QueryHistoryEntry[],
  timeRange: TimeRange
): PerformanceTrends {
  const buckets = groupQueriesByTimeBucket(queries, timeRange);

  const queryCountTrend: TrendData[] = [];
  const executionTimeTrend: TrendData[] = [];
  const errorRateTrend: TrendData[] = [];

  Object.entries(buckets).forEach(([timestamp, bucketQueries]) => {
    queryCountTrend.push({
      timestamp,
      value: bucketQueries.length,
    });

    const avgTime = bucketQueries.length > 0
      ? average(bucketQueries.map((q) => q.executionTimeMs || 0))
      : 0;
    executionTimeTrend.push({
      timestamp,
      value: avgTime,
    });

    const errorCount = bucketQueries.filter((q) => q.status === "error").length;
    const errorRate = bucketQueries.length > 0
      ? (errorCount / bucketQueries.length) * 100
      : 0;
    errorRateTrend.push({
      timestamp,
      value: errorRate,
    });
  });

  const tableAccessTrend = calculateTableAccessTrends(queries);

  return {
    timeRange: timeRange,
    queryCountTrend,
    executionTimeTrend,
    errorRateTrend,
    tableAccessTrend,
  };
}

/**
 * Calculate table access trends
 */
function calculateTableAccessTrends(
  queries: QueryHistoryEntry[]
): TableAccessTrend[] {
  const tableCounts = new Map<string, number[]>();

  // Split queries into two halves to compare trends
  const midpoint = Math.floor(queries.length / 2);
  const firstHalf = queries.slice(0, midpoint);
  const secondHalf = queries.slice(midpoint);

  [firstHalf, secondHalf].forEach((half, index) => {
    half.forEach((query) => {
      query.tables?.forEach((table) => {
        if (!tableCounts.has(table)) {
          tableCounts.set(table, [0, 0]);
        }
        tableCounts.get(table)![index]++;
      });
    });
  });

  const trends: TableAccessTrend[] = [];
  tableCounts.forEach(([firstCount, secondCount], tableName) => {
    const totalCount = firstCount + secondCount;
    const change = secondCount - firstCount;
    const changePercentage = firstCount > 0 ? (change / firstCount) * 100 : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (changePercentage > 10) trend = "up";
    else if (changePercentage < -10) trend = "down";

    trends.push({
      tableName,
      accessCount: totalCount,
      trend,
      changePercentage,
    });
  });

  return trends.sort((a, b) => b.accessCount - a.accessCount).slice(0, 10);
}

/**
 * Generate performance alerts
 */
export function generatePerformanceAlerts(
  metrics: PerformanceMetrics,
  slowQueryThreshold: number = 1000,
  errorRateThreshold: number = 5
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];

  // Slow query alert
  if (metrics.slowQueries.length > 0) {
    const slowestQuery = metrics.slowQueries[0];
    if (slowestQuery.executionTime > slowQueryThreshold * 5) {
      alerts.push({
        id: `slow-query-${Date.now()}`,
        severity: "critical",
        type: "slow_query",
        message: `Extremely slow query detected: ${slowestQuery.executionTime}ms`,
        timestamp: new Date().toISOString(),
        value: slowestQuery.executionTime,
        threshold: slowQueryThreshold * 5,
      });
    } else if (slowestQuery.executionTime > slowQueryThreshold) {
      alerts.push({
        id: `slow-query-${Date.now()}`,
        severity: "warning",
        type: "slow_query",
        message: `Slow query detected: ${slowestQuery.executionTime}ms`,
        timestamp: new Date().toISOString(),
        value: slowestQuery.executionTime,
        threshold: slowQueryThreshold,
      });
    }
  }

  // High error rate alert
  if (metrics.queryPerformance.errorRate > errorRateThreshold * 2) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      severity: "critical",
      type: "high_error_rate",
      message: `Critical error rate: ${metrics.queryPerformance.errorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      value: metrics.queryPerformance.errorRate,
      threshold: errorRateThreshold * 2,
    });
  } else if (metrics.queryPerformance.errorRate > errorRateThreshold) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      severity: "warning",
      type: "high_error_rate",
      message: `Elevated error rate: ${metrics.queryPerformance.errorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      value: metrics.queryPerformance.errorRate,
      threshold: errorRateThreshold,
    });
  }

  // Large table alert
  metrics.tableStatistics.forEach((table) => {
    if (table.rowCount > 100000) {
      alerts.push({
        id: `table-size-${table.tableName}`,
        severity: "info",
        type: "table_size",
        message: `Table '${table.tableName}' has ${table.rowCount.toLocaleString()} rows`,
        timestamp: new Date().toISOString(),
        value: table.rowCount,
        threshold: 100000,
      });
    }
  });

  return alerts;
}

/**
 * Generate performance recommendations
 */
export function generateRecommendations(
  metrics: PerformanceMetrics
): string[] {
  const recommendations: string[] = [];

  // Slow queries
  if (metrics.slowQueries.length > 5) {
    recommendations.push(
      `Consider optimizing ${metrics.slowQueries.length} slow queries. Average execution time: ${metrics.queryPerformance.averageExecutionTime.toFixed(0)}ms`
    );
  }

  // High error rate
  if (metrics.queryPerformance.errorRate > 5) {
    recommendations.push(
      `Error rate is ${metrics.queryPerformance.errorRate.toFixed(1)}%. Review failed queries and fix errors.`
    );
  }

  // Frequently accessed tables
  const hotTables = metrics.tableStatistics
    .filter((t) => t.totalQueries > 100)
    .slice(0, 3);

  if (hotTables.length > 0) {
    recommendations.push(
      `Hot tables: ${hotTables.map((t) => t.tableName).join(", ")}. Consider adding indexes for better performance.`
    );
  }

  // Large tables
  const largeTables = metrics.tableStatistics.filter((t) => t.rowCount > 10000);
  if (largeTables.length > 0) {
    recommendations.push(
      `${largeTables.length} table(s) have over 10,000 rows. Monitor query performance and consider partitioning if needed.`
    );
  }

  // Unbalanced read/write
  metrics.tableStatistics.forEach((table) => {
    if (table.writeOperations > table.readOperations * 2) {
      recommendations.push(
        `Table '${table.tableName}' has high write-to-read ratio. Consider batch updates if possible.`
      );
    }
  });

  if (recommendations.length === 0) {
    recommendations.push("No performance issues detected. Database is performing well!");
  }

  return recommendations;
}

/**
 * Generate complete performance report
 */
export function generatePerformanceReport(
  queries: QueryHistoryEntry[],
  tables: Array<{ name: string; columnCount: number; rowCount: number }>,
  timeRange: TimeRange = "24h"
): PerformanceReport {
  const filteredQueries = filterQueriesByTimeRange(queries, timeRange);

  const queryPerformance = calculateQueryPerformance(filteredQueries);
  const tableStatistics = generateTableStatistics(filteredQueries, tables);
  const systemMetrics = calculateSystemMetrics(filteredQueries, tableStatistics);
  const slowQueries = identifySlowQueries(filteredQueries);
  const trends = calculatePerformanceTrends(filteredQueries, timeRange);

  const metrics: PerformanceMetrics = {
    queryPerformance,
    tableStatistics,
    systemMetrics,
    slowQueries,
    trends,
  };

  const alerts = generatePerformanceAlerts(metrics);
  const recommendations = generateRecommendations(metrics);

  const timeRangeStart =
    filteredQueries.length > 0
      ? filteredQueries[0].executedAt
      : new Date().toISOString();
  const timeRangeEnd =
    filteredQueries.length > 0
      ? filteredQueries[filteredQueries.length - 1].executedAt
      : new Date().toISOString();

  return {
    generatedAt: new Date().toISOString(),
    timeRange: {
      start: timeRangeStart,
      end: timeRangeEnd,
    },
    summary: {
      totalQueries: queryPerformance.totalQueries,
      averageResponseTime: queryPerformance.averageExecutionTime,
      errorCount: Math.round(
        (queryPerformance.errorRate / 100) * queryPerformance.totalQueries
      ),
      peakQueriesPerSecond: queryPerformance.queriesPerSecond,
    },
    metrics,
    alerts,
    recommendations,
  };
}

/**
 * Utility functions
 */

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function percentile(sortedNumbers: number[], p: number): number {
  if (sortedNumbers.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedNumbers.length) - 1;
  return sortedNumbers[Math.max(0, index)];
}

function getTimeSpan(queries: QueryHistoryEntry[]): number {
  if (queries.length < 2) return 0;
  const first = new Date(queries[0].executedAt).getTime();
  const last = new Date(queries[queries.length - 1].executedAt).getTime();
  return (last - first) / 1000; // seconds
}

function estimateTableSize(rows: number, columns: number): number {
  // Rough estimate: average 50 bytes per cell
  return rows * columns * 50;
}

function groupQueriesByTimeBucket(
  queries: QueryHistoryEntry[],
  timeRange: TimeRange
): Record<string, QueryHistoryEntry[]> {
  const buckets: Record<string, QueryHistoryEntry[]> = {};
  const bucketSize = getBucketSize(timeRange);

  queries.forEach((query) => {
    const timestamp = new Date(query.executedAt);
    const bucketKey = new Date(
      Math.floor(timestamp.getTime() / bucketSize) * bucketSize
    ).toISOString();

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(query);
  });

  return buckets;
}

function getBucketSize(timeRange: TimeRange): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;

  switch (timeRange) {
    case "1h":
      return 5 * minute;
    case "6h":
      return 15 * minute;
    case "24h":
      return hour;
    case "7d":
      return 6 * hour;
    case "30d":
      return 24 * hour;
    default:
      return hour;
  }
}

function filterQueriesByTimeRange(
  queries: QueryHistoryEntry[],
  timeRange: TimeRange
): QueryHistoryEntry[] {
  if (timeRange === "all") return queries;

  const now = new Date();
  const cutoff = new Date();

  switch (timeRange) {
    case "1h":
      cutoff.setHours(now.getHours() - 1);
      break;
    case "6h":
      cutoff.setHours(now.getHours() - 6);
      break;
    case "24h":
      cutoff.setHours(now.getHours() - 24);
      break;
    case "7d":
      cutoff.setDate(now.getDate() - 7);
      break;
    case "30d":
      cutoff.setDate(now.getDate() - 30);
      break;
  }

  return queries.filter((q) => new Date(q.executedAt) >= cutoff);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

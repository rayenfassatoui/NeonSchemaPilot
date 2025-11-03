/**
 * Performance Analytics Types
 * Defines types for database performance monitoring and analytics
 */

export interface PerformanceMetrics {
  queryPerformance: QueryPerformanceMetrics;
  tableStatistics: TableStatistics[];
  systemMetrics: SystemMetrics;
  slowQueries: SlowQuery[];
  trends: PerformanceTrends;
}

export interface QueryPerformanceMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  fastestQuery: number;
  slowestQuery: number;
  successRate: number;
  errorRate: number;
  queriesPerSecond: number;
  byOperationType: {
    DDL: OperationTypeMetrics;
    DML: OperationTypeMetrics;
    DQL: OperationTypeMetrics;
    DCL: OperationTypeMetrics;
  };
}

export interface OperationTypeMetrics {
  count: number;
  averageTime: number;
  totalTime: number;
  successRate: number;
}

export interface TableStatistics {
  tableName: string;
  rowCount: number;
  columnCount: number;
  estimatedSize: number;
  totalQueries: number;
  avgQueryTime: number;
  lastAccessed: string;
  mostFrequentOperation: string;
  indexCount?: number;
  readOperations: number;
  writeOperations: number;
}

export interface SystemMetrics {
  totalTables: number;
  totalRows: number;
  totalQueries: number;
  uptimeSeconds: number;
  memoryUsage?: number;
  cacheHitRate?: number;
  connectionCount?: number;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  timestamp: string;
  operationType: string;
  affectedTables: string[];
  rowsAffected?: number;
}

export interface PerformanceTrends {
  timeRange: string;
  queryCountTrend: TrendData[];
  executionTimeTrend: TrendData[];
  errorRateTrend: TrendData[];
  tableAccessTrend: TableAccessTrend[];
}

export interface TrendData {
  timestamp: string;
  value: number;
}

export interface TableAccessTrend {
  tableName: string;
  accessCount: number;
  trend: "up" | "down" | "stable";
  changePercentage: number;
}

export interface PerformanceAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  type: "slow_query" | "high_error_rate" | "memory_usage" | "table_size";
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
}

export interface PerformanceReport {
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
  summary: {
    totalQueries: number;
    averageResponseTime: number;
    errorCount: number;
    peakQueriesPerSecond: number;
  };
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "all";

export interface PerformanceConfig {
  slowQueryThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  enableAlerts: boolean;
  sampleRate: number; // 0-1
}

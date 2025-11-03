/**
 * Performance Dashboard Component
 * Displays comprehensive performance analytics and metrics
 */

"use client";

import { useState, useEffect } from "react";
import {
    Activity, Zap,
    AlertTriangle,
    Clock,
    Database,
    BarChart3,
    RefreshCw,
    CheckCircle,
    XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { PerformanceReport, TimeRange } from "@/types/performance";
import { formatDuration, formatBytes } from "@/lib/performance-utils";

interface PerformanceDashboardProps {
  connectionString?: string;
}

export function PerformanceDashboard({ connectionString }: PerformanceDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ timeRange });
      if (connectionString) {
        // URL encode the connection string to prevent corruption of special characters
        params.set("connectionString", encodeURIComponent(connectionString));
      }

      const response = await fetch(`/api/performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch performance data");

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange, connectionString]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  const { summary, metrics, alerts, recommendations } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Monitor database performance and identify optimization opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchPerformanceData} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.severity === "critical" ? "destructive" : "default"}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">{alert.severity} Alert</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQueries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.queryPerformance.queriesPerSecond.toFixed(2)} queries/sec
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summary.averageResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              P95: {formatDuration(metrics.queryPerformance.p95ExecutionTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.queryPerformance.successRate.toFixed(1)}%
            </div>
            <Progress value={metrics.queryPerformance.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.errorCount}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.queryPerformance.errorRate.toFixed(1)}% error rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Query Performance by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Query Performance by Type</CardTitle>
                <CardDescription>Average execution time by operation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.queryPerformance.byOperationType).map(([type, stats]) => (
                  stats.count > 0 && (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{type}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.count} queries
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={(stats.averageTime / metrics.queryPerformance.averageExecutionTime) * 100}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-16 text-right">
                          {formatDuration(stats.averageTime)}
                        </span>
                      </div>
                    </div>
                  )
                ))}
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Database statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Tables</span>
                  <span className="font-medium">{metrics.systemMetrics.totalTables}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Rows</span>
                  <span className="font-medium">
                    {metrics.systemMetrics.totalRows.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="font-medium">
                    {formatDuration(metrics.systemMetrics.uptimeSeconds * 1000)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries</CardTitle>
              <CardDescription>
                Queries taking longer than 1 second ({metrics.slowQueries.length} found)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.slowQueries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2" />
                  <p>No slow queries detected. Great performance!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.slowQueries.slice(0, 10).map((query, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <code className="text-sm flex-1 bg-muted px-2 py-1 rounded">
                          {query.query.length > 100
                            ? query.query.slice(0, 100) + "..."
                            : query.query}
                        </code>
                        <Badge variant="outline">{formatDuration(query.executionTime)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {query.operationType}
                        </Badge>
                        {query.affectedTables.length > 0 && (
                          <span>Tables: {query.affectedTables.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Statistics</CardTitle>
              <CardDescription>Performance metrics for each table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.tableStatistics.slice(0, 10).map((table) => (
                  <div key={table.tableName} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{table.tableName}</span>
                      </div>
                      <Badge>{table.mostFrequentOperation}</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Rows</div>
                        <div className="font-medium">{table.rowCount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Columns</div>
                        <div className="font-medium">{table.columnCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Queries</div>
                        <div className="font-medium">{table.totalQueries}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Time</div>
                        <div className="font-medium">{formatDuration(table.avgQueryTime)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Reads: {table.readOperations} |  Writes: {table.writeOperations}
                      </span>
                      <span>Size: ~{formatBytes(table.estimatedSize)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>
                Suggestions to improve database performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm flex-1">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

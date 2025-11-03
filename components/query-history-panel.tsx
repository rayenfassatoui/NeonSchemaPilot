"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { QueryHistoryEntry, QueryHistoryStats } from "@/types/query-history";

export function QueryHistoryPanel() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [stats, setStats] = useState<QueryHistoryStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (filterType !== "all") params.append("operationType", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);

      const response = await fetch(`/api/query-history?${params}`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch query history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/query-history?stats=true");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [searchTerm, filterType, filterStatus]);

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all query history?")) return;

    try {
      await fetch("/api/query-history?clear=true", { method: "DELETE" });
      setHistory([]);
      fetchStats();
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await fetch(`/api/query-history?id=${id}`, { method: "DELETE" });
      setHistory(history.filter((entry) => entry.id !== id));
      fetchStats();
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case "DDL":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "DML":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "DQL":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "DCL":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Query History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DDL">DDL</SelectItem>
                  <SelectItem value="DML">DML</SelectItem>
                  <SelectItem value="DQL">DQL</SelectItem>
                  <SelectItem value="DCL">DCL</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleClearHistory}
                title="Clear all history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* History List */}
            <ScrollArea className="h-[500px] rounded-md border p-4">
              {loading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : history.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No query history found
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getOperationColor(entry.operationType)}
                            >
                              {entry.operationType}
                            </Badge>
                            {entry.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.executedAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <code className="block rounded bg-muted p-2 text-xs">
                            {entry.query}
                          </code>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {entry.executionTimeMs !== undefined && (
                              <span>⏱️ {entry.executionTimeMs}ms</span>
                            )}
                            {entry.affectedRows !== undefined && (
                              <span>📊 {entry.affectedRows} rows</span>
                            )}
                            {entry.tables && entry.tables.length > 0 && (
                              <span>📋 {entry.tables.join(", ")}</span>
                            )}
                          </div>
                          {entry.errorMessage && (
                            <div className="text-xs text-red-500">
                              ❌ {entry.errorMessage}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {stats && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Queries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalQueries}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {stats.totalQueries > 0
                        ? ((stats.successfulQueries / stats.totalQueries) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Execution Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.avgExecutionTime.toFixed(2)}ms
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failed Queries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {stats.failedQueries}
                    </div>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Query Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.queryTypeDistribution).map(
                        ([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={getOperationColor(type)}
                            >
                              {type}
                            </Badge>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

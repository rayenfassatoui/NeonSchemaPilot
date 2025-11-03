"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChartViewer } from "./chart-viewer";
import type { ChartConfig, ChartResponse, TableStats } from "@/types/charts";

interface ChartGalleryProps {
  tables: Array<{ name: string }>;
  connectionString?: string;
}

export function ChartGallery({ tables, connectionString }: ChartGalleryProps) {
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.name || "");
  const [suggestions, setSuggestions] = useState<ChartConfig[]>([]);
  const [stats, setStats] = useState<TableStats | null>(null);
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);
  const [chartResponse, setChartResponse] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      fetchSuggestions(selectedTable);
    }
  }, [selectedTable]);

  const fetchSuggestions = async (tableName: string) => {
    setLoading(true);
    setSuggestions([]);
    setStats(null);
    setSelectedChart(null);
    setChartResponse(null);

    try {
      const params = new URLSearchParams({ table: tableName });
      if (connectionString) {
        const encoded = Buffer.from(connectionString).toString("base64");
        params.append("connection", encoded);
      }

      const response = await fetch(`/api/charts?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch suggestions");
      }

      setSuggestions(data.suggestions);
      setStats(data.stats);

      // Auto-select first suggestion
      if (data.suggestions.length > 0) {
        generateChart(data.suggestions[0]);
      }
    } catch (error) {
      console.error("Failed to fetch chart suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateChart = async (config: ChartConfig) => {
    setSelectedChart(config);
    setGenerating(true);

    try {
      const response = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, connectionString }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate chart");
      }

      setChartResponse(data);
    } catch (error) {
      console.error("Failed to generate chart:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <div className="space-y-4">
        {/* Table Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select Table</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {tables.map((table) => (
                  <Button
                    key={table.name}
                    variant={selectedTable === table.name ? "default" : "outline"}
                    className="w-full justify-start font-mono text-sm"
                    onClick={() => setSelectedTable(table.name)}
                  >
                    {table.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chart Suggestions */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Suggested Charts
              </CardTitle>
              <CardDescription>
                {stats.rowCount} rows · {stats.columnCount} columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        variant={selectedChart?.id === suggestion.id ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => generateChart(suggestion)}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{suggestion.title}</div>
                          <Badge variant="secondary" className="mt-1 text-xs uppercase">
                            {suggestion.type}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Column Info */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Column Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.numericColumns.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Numeric ({stats.numericColumns.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.numericColumns.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {stats.categoricalColumns.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Categorical ({stats.categoricalColumns.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.categoricalColumns.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {stats.dateColumns.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Date/Time ({stats.dateColumns.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.dateColumns.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart Display */}
      <div>
        {generating ? (
          <Card>
            <CardContent className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">Generating chart...</p>
              </div>
            </CardContent>
          </Card>
        ) : chartResponse ? (
          <ChartViewer chartResponse={chartResponse} />
        ) : (
          <Card>
            <CardContent className="flex h-[600px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Sparkles className="mx-auto h-12 w-12 opacity-20" />
                <p className="mt-4">Select a table to view suggested charts</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Database, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ExportFormat } from "@/types/export";
import { formatFileSize } from "@/lib/export-utils";

interface ExportPanelProps {
  tables: Array<{ name: string; rowCount?: number }>;
  connectionString?: string;
}

export function ExportPanel({ tables, connectionString }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [selectedTables, setSelectedTables] = useState<string[]>(
    tables.map((t) => t.name)
  );
  const [includeSchema, setIncludeSchema] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [pretty, setPretty] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{
    filename: string;
    size: number;
  } | null>(null);

  const handleTableToggle = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleSelectAll = () => {
    setSelectedTables(tables.map((t) => t.name));
  };

  const handleDeselectAll = () => {
    setSelectedTables([]);
  };

  const handleExport = async () => {
    setError(null);
    setExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          tables: selectedTables,
          includeSchema,
          includeData,
          pretty,
          connectionString,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Export failed");
      }

      // Create and download file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastExport({
        filename: result.filename,
        size: result.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const getFormatIcon = (fmt: ExportFormat) => {
    switch (fmt) {
      case "json":
        return <FileJson className="h-5 w-5" />;
      case "csv":
        return <FileSpreadsheet className="h-5 w-5" />;
      case "sql":
        return <Database className="h-5 w-5" />;
    }
  };

  const getFormatDescription = (fmt: ExportFormat) => {
    switch (fmt) {
      case "json":
        return "JavaScript Object Notation - ideal for APIs and data interchange";
      case "csv":
        return "Comma-Separated Values - perfect for Excel and spreadsheets";
      case "sql":
        return "SQL statements - ready to import into any SQL database";
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
          <CardDescription>Choose the format for your exported data</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="space-y-3">
              {(["json", "csv", "sql"] as ExportFormat[]).map((fmt) => (
                <div
                  key={fmt}
                  className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <RadioGroupItem value={fmt} id={fmt} />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={fmt} className="flex items-center gap-2 cursor-pointer">
                      {getFormatIcon(fmt)}
                      <span className="font-semibold uppercase">{fmt}</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {getFormatDescription(fmt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Table Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Tables</CardTitle>
              <CardDescription>
                Choose which tables to include in the export
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={table.name}
                      checked={selectedTables.includes(table.name)}
                      onCheckedChange={() => handleTableToggle(table.name)}
                    />
                    <Label htmlFor={table.name} className="cursor-pointer font-mono">
                      {table.name}
                    </Label>
                  </div>
                  {table.rowCount !== undefined && (
                    <Badge variant="secondary">{table.rowCount} rows</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedTables.length} of {tables.length} tables selected
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Customize what to include in the export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeSchema"
              checked={includeSchema}
              onCheckedChange={(checked) => setIncludeSchema(checked as boolean)}
            />
            <Label htmlFor="includeSchema" className="cursor-pointer">
              Include table schema (column definitions)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeData"
              checked={includeData}
              onCheckedChange={(checked) => setIncludeData(checked as boolean)}
            />
            <Label htmlFor="includeData" className="cursor-pointer">
              Include table data (rows)
            </Label>
          </div>

          {format === "json" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pretty"
                checked={pretty}
                onCheckedChange={(checked) => setPretty(checked as boolean)}
              />
              <Label htmlFor="pretty" className="cursor-pointer">
                Pretty print (formatted with indentation)
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="space-y-4">
        <Button
          onClick={handleExport}
          disabled={exporting || selectedTables.length === 0}
          className="w-full"
          size="lg"
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Export {selectedTables.length} {selectedTables.length === 1 ? "Table" : "Tables"}
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lastExport && !error && (
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              Successfully exported <strong>{lastExport.filename}</strong> (
              {formatFileSize(lastExport.size)})
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

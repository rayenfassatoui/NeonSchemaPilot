/**
 * Database Import Panel Component
 * Interactive UI for importing data from CSV, JSON, and SQL files
 */

"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ImportFormat, ImportMode, ImportResult, ImportPreview } from "@/types/import";
import { formatFileSize } from "@/lib/import-utils";

interface DatabaseImportPanelProps {
  connectionString?: string;
  existingTables?: string[];
}

export function DatabaseImportPanel({ connectionString, existingTables = [] }: DatabaseImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [mode, setMode] = useState<ImportMode>("create");
  const [targetTable, setTargetTable] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [hasHeader, setHasHeader] = useState(true);
  const [createTableIfNotExists, setCreateTableIfNotExists] = useState(true);
  const [truncateBeforeImport, setTruncateBeforeImport] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);
  const [validateSchema, setValidateSchema] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setPreview(null);
      
      // Auto-detect format from extension
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv") setFormat("csv");
      else if (ext === "json") setFormat("json");
      else if (ext === "sql") setFormat("sql");
      
      // Auto-set table name from filename
      if (!targetTable) {
        const name = selectedFile.name.replace(/\.(csv|json|sql)$/i, "").replace(/[^a-zA-Z0-9_]/g, "_");
        setTargetTable(name);
      }
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewing(true);
    setError(null);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", format);

      const response = await fetch("/api/import", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const data = await response.json();
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !targetTable) {
      setError("Please select a file and provide a table name");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const options = {
        format,
        mode,
        targetTable,
        delimiter: format === "csv" ? delimiter : undefined,
        hasHeader: format === "csv" ? hasHeader : undefined,
        createTableIfNotExists,
        truncateBeforeImport,
        skipErrors,
        validateSchema,
      };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("options", JSON.stringify(options));
      if (connectionString) {
        formData.append("connectionString", connectionString);
      }

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      const importResult: ImportResult = await response.json();
      setResult(importResult);

      if (!importResult.success) {
        setError(importResult.message || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select a CSV, JSON, or SQL file to import into your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.sql"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}
              >
                Remove
              </Button>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ImportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal cursor-pointer">JSON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sql" id="sql" />
                <Label htmlFor="sql" className="font-normal cursor-pointer">SQL</Label>
              </div>
            </RadioGroup>
          </div>

          {/* CSV-specific options */}
          {format === "csv" && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="delimiter">Delimiter</Label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger id="delimiter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                    <SelectItem value="|">Pipe (|)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHeader"
                  checked={hasHeader}
                  onCheckedChange={(checked) => setHasHeader(checked as boolean)}
                />
                <Label htmlFor="hasHeader" className="font-normal cursor-pointer">
                  First row contains column names
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
          <CardDescription>
            Configure how the data should be imported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetTable">Target Table Name</Label>
            <Input
              id="targetTable"
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              placeholder="e.g., customers"
            />
          </div>

          <div className="space-y-2">
            <Label>Import Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="create" id="create" />
                <Label htmlFor="create" className="font-normal cursor-pointer">
                  Create new table (fail if exists)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="append" id="append" />
                <Label htmlFor="append" className="font-normal cursor-pointer">
                  Append to existing table
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="font-normal cursor-pointer">
                  Replace table (drop and recreate)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Options</Label>
            
            {mode === "append" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createTableIfNotExists"
                  checked={createTableIfNotExists}
                  onCheckedChange={(checked) => setCreateTableIfNotExists(checked as boolean)}
                />
                <Label htmlFor="createTableIfNotExists" className="font-normal cursor-pointer">
                  Create table if it doesn't exist
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="truncateBeforeImport"
                checked={truncateBeforeImport}
                onCheckedChange={(checked) => setTruncateBeforeImport(checked as boolean)}
              />
              <Label htmlFor="truncateBeforeImport" className="font-normal cursor-pointer">
                Clear existing data before import
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipErrors"
                checked={skipErrors}
                onCheckedChange={(checked) => setSkipErrors(checked as boolean)}
              />
              <Label htmlFor="skipErrors" className="font-normal cursor-pointer">
                Continue on errors (skip invalid rows)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="validateSchema"
                checked={validateSchema}
                onCheckedChange={(checked) => setValidateSchema(checked as boolean)}
              />
              <Label htmlFor="validateSchema" className="font-normal cursor-pointer">
                Validate data before import
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handlePreview}
          variant="outline"
          disabled={!file || previewing || loading}
          className="flex-1"
        >
          {previewing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Previewing...
            </>
          ) : (
            "Preview Data"
          )}
        </Button>
        
        <Button
          onClick={handleImport}
          disabled={!file || !targetTable || loading || previewing}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </>
          )}
        </Button>
      </div>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              {preview.rowCount} rows • {preview.columns.length} columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {preview.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2">Columns</h4>
              <div className="flex flex-wrap gap-2">
                {preview.columns.map((col) => (
                  <Badge key={col.name} variant="secondary">
                    {col.name} <span className="text-muted-foreground ml-1">({col.type})</span>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {preview.columns.map((col) => (
                      <th key={col.name} className="px-3 py-2 text-left font-medium">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, i) => (
                    <tr key={i} className="border-b">
                      {preview.columns.map((col) => (
                        <td key={col.name} className="px-3 py-2">
                          {String(row[col.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{result.message}</p>
              <div className="text-sm space-y-1">
                <p>Rows imported: {result.rowsImported}</p>
                {result.rowsSkipped > 0 && <p>Rows skipped: {result.rowsSkipped}</p>}
                <p>Execution time: {result.executionTimeMs}ms</p>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-sm">Errors:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && !result && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

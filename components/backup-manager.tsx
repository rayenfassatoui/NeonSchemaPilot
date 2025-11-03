"use client";

/**
 * Backup Manager Component
 * Interface for creating and managing database backups
 */

import { useState, useEffect } from "react";
import { Download, RefreshCw, Database, Calendar, FileText, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { BackupFormat, BackupMetadata, BackupPreview } from "@/types/backup";
import { formatFileSize } from "@/lib/backup-utils";

interface BackupManagerProps {
  connectionString?: string;
}

export function BackupManager({ connectionString }: BackupManagerProps) {
  const [backupName, setBackupName] = useState("");
  const [backupDescription, setBackupDescription] = useState("");
  const [format, setFormat] = useState<BackupFormat>("sql");
  const [includeSchema, setIncludeSchema] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preview on mount
  useEffect(() => {
    loadPreview();
  }, [format, connectionString]);

  const loadPreview = async () => {
    try {
      const params = new URLSearchParams({ format });
      if (connectionString) {
        params.set("connectionString", encodeURIComponent(connectionString));
      }

      const response = await fetch(`/api/backup?${params}`);
      if (!response.ok) throw new Error("Failed to load preview");

      const data = await response.json();
      setPreview(data);
    } catch (err) {
      console.error("Error loading preview:", err);
    }
  };

  const createBackup = async () => {
    if (!backupName.trim()) {
      setError("Backup name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            name: backupName,
            description: backupDescription,
            format,
            includeSchema,
            includeData,
          },
          connectionString: connectionString ? encodeURIComponent(connectionString) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create backup");
      }

      const result = await response.json();

      // Download the backup file
      const blob = new Blob([result.data], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${backupName.replace(/\s+/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Add to backups list
      setBackups([result.metadata, ...backups]);

      // Reset form
      setBackupName("");
      setBackupDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Backup</TabsTrigger>
          <TabsTrigger value="history">Backup History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Backup Configuration</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-name">Backup Name *</Label>
                    <Input
                      id="backup-name"
                      value={backupName}
                      onChange={(e) => setBackupName(e.target.value)}
                      placeholder="e.g., Weekly Backup - 2024-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backup-description">Description</Label>
                    <Textarea
                      id="backup-description"
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                      placeholder="Optional description for this backup"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Format</Label>
                    <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sql">SQL (.sql)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-schema">Include Schema</Label>
                    <Switch
                      id="include-schema"
                      checked={includeSchema}
                      onCheckedChange={setIncludeSchema}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-data">Include Data</Label>
                    <Switch
                      id="include-data"
                      checked={includeData}
                      onCheckedChange={setIncludeData}
                    />
                  </div>
                </div>
              </div>

              {preview && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Backup Preview</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tables</p>
                      <p className="font-medium">{preview.tables.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimated Size</p>
                      <p className="font-medium">{formatFileSize(preview.totalSize)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Duration</p>
                      <p className="font-medium">{preview.estimatedDuration}s</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={createBackup}
                disabled={loading || !backupName.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create & Download Backup
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Backup History</h3>
            
            {backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups created yet</p>
                <p className="text-sm">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        {backup.description && (
                          <p className="text-sm text-muted-foreground">{backup.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{backup.format.toUpperCase()}</Badge>
                          <Badge variant="outline">{formatFileSize(backup.size)}</Badge>
                          <Badge variant="outline">{backup.tableCount} tables</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(backup.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

/**
 * Schedule Manager Component
 * Interface for managing scheduled queries
 */

import { useState, useEffect } from "react";
import { Play, Pause, Trash2, Plus, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Schedule, ScheduleFrequency, ScheduleSuggestion } from "@/types/schedule";
import { cronToDescription } from "@/lib/schedule-utils";

interface ScheduleManagerProps {
  connectionString?: string;
}

export function ScheduleManager({ connectionString }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [cronExpression, setCronExpression] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  // Load suggestions when query changes
  useEffect(() => {
    if (query.trim().length > 10) {
      loadSuggestions();
    }
  }, [query]);

  const loadSchedules = async () => {
    try {
      const response = await fetch("/api/schedules");
      if (!response.ok) throw new Error("Failed to load schedules");

      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error("Error loading schedules:", err);
      setError("Failed to load schedules");
    }
  };

  const loadSuggestions = async () => {
    try {
      const params = new URLSearchParams({
        action: "suggestions",
        query,
      });

      const response = await fetch(`/api/schedules?${params}`);
      if (!response.ok) return;

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Error loading suggestions:", err);
    }
  };

  const createSchedule = async () => {
    if (!name.trim() || !query.trim()) {
      setError("Name and query are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          query,
          frequency,
          cronExpression: frequency === "custom" ? cronExpression : undefined,
          enabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create schedule");
      }

      const result = await response.json();
      setSchedules([result.schedule, ...schedules]);

      // Reset form
      setName("");
      setDescription("");
      setQuery("");
      setFrequency("daily");
      setCronExpression("");
      setEnabled(true);
      setIsCreateDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (scheduleId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scheduleId,
          updates: { enabled: !currentEnabled },
        }),
      });

      if (!response.ok) throw new Error("Failed to update schedule");

      const result = await response.json();
      setSchedules(schedules.map((s) => (s.id === scheduleId ? result.schedule : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      const response = await fetch(`/api/schedules?id=${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete schedule");

      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  };

  const getStatusIcon = (status: Schedule["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Queries</h3>
          <p className="text-sm text-muted-foreground">Automate query execution</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-name">Name *</Label>
                <Input
                  id="schedule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Daily Report Generation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-description">Description</Label>
                <Input
                  id="schedule-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-query">SQL Query *</Label>
                <Textarea
                  id="schedule-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM users WHERE ..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom (Cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="cron-expression">Cron Expression</Label>
                  <Input
                    id="cron-expression"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 0 * * *"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day month weekday (e.g., "0 0 * * *" for daily at midnight)
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-enabled">Enabled</Label>
                <Switch
                  id="schedule-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {suggestions.length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Suggested Schedules</h4>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFrequency(suggestion.frequency);
                          if (suggestion.cronExpression) {
                            setCronExpression(suggestion.cronExpression);
                          }
                        }}
                        className="w-full justify-start text-left"
                      >
                        <div>
                          <div className="font-medium">{cronToDescription(suggestion.cronExpression || "")}</div>
                          <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={createSchedule} disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Schedule"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {schedules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled queries yet</p>
            <p className="text-sm">Create your first schedule to automate query execution</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(schedule.status)}
                    <p className="font-medium">{schedule.name}</p>
                    <Badge variant={schedule.enabled ? "default" : "secondary"}>
                      {schedule.enabled ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline">{schedule.queryType.toUpperCase()}</Badge>
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-muted-foreground mb-2">{schedule.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Frequency:</span>{" "}
                      {cronToDescription(schedule.cronExpression || "")}
                    </div>
                    {schedule.nextRun && (
                      <div>
                        <span className="font-medium">Next Run:</span>{" "}
                        {new Date(schedule.nextRun).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSchedule(schedule.id, schedule.enabled)}
                    title={schedule.enabled ? "Pause" : "Resume"}
                  >
                    {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSchedule(schedule.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

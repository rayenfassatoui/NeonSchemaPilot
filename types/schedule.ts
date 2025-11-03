/**
 * Scheduled Queries Types
 */

export type ScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly" | "custom";

export type ScheduleStatus = "active" | "paused" | "disabled" | "error";

export type QueryType = "select" | "insert" | "update" | "delete" | "ddl";

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  query: string;
  queryType: QueryType;
  frequency: ScheduleFrequency;
  cronExpression?: string; // For custom schedules
  enabled: boolean;
  status: ScheduleStatus;
  nextRun?: string;
  lastRun?: string;
  lastRunStatus?: "success" | "failed";
  lastRunDuration?: number; // in milliseconds
  lastRunError?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ScheduleOptions {
  name: string;
  description?: string;
  query: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  enabled?: boolean;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  timeoutSeconds?: number;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  scheduleName: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in milliseconds
  status: "running" | "success" | "failed" | "timeout";
  rowsAffected?: number;
  error?: string;
  result?: any;
}

export interface ScheduleStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutionTime?: string;
  uptime: number; // percentage
}

export interface ScheduleSuggestion {
  frequency: ScheduleFrequency;
  cronExpression?: string;
  reason: string;
  estimatedLoad: "low" | "medium" | "high";
}

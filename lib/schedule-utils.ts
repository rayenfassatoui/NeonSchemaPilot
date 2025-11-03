/**
 * Scheduled Queries Utilities
 * Functions for managing and executing scheduled queries
 */

import type {
    Schedule, ScheduleExecution,
    ScheduleStatistics,
    ScheduleSuggestion,
    ScheduleFrequency,
    QueryType
} from "@/types/schedule";

/**
 * Parse query to determine type
 */
export function detectQueryType(query: string): QueryType {
  const normalized = query.trim().toUpperCase();
  
  if (normalized.startsWith("SELECT")) return "select";
  if (normalized.startsWith("INSERT")) return "insert";
  if (normalized.startsWith("UPDATE")) return "update";
  if (normalized.startsWith("DELETE")) return "delete";
  if (
    normalized.startsWith("CREATE") ||
    normalized.startsWith("ALTER") ||
    normalized.startsWith("DROP")
  ) {
    return "ddl";
  }
  
  return "select"; // Default to select
}

/**
 * Convert frequency to cron expression
 */
export function frequencyToCron(frequency: ScheduleFrequency): string {
  switch (frequency) {
    case "hourly":
      return "0 * * * *"; // Every hour at minute 0
    case "daily":
      return "0 0 * * *"; // Every day at midnight
    case "weekly":
      return "0 0 * * 0"; // Every Sunday at midnight
    case "monthly":
      return "0 0 1 * *"; // First day of month at midnight
    default:
      return "0 * * * *"; // Default to hourly
  }
}

/**
 * Parse cron expression to human-readable description
 */
export function cronToDescription(cronExpression: string): string {
  const parts = cronExpression.split(" ");
  
  if (cronExpression === "0 * * * *") return "Every hour";
  if (cronExpression === "0 0 * * *") return "Daily at midnight";
  if (cronExpression === "0 0 * * 0") return "Weekly on Sunday";
  if (cronExpression === "0 0 1 * *") return "Monthly on the 1st";
  
  // Basic parsing for common patterns
  if (parts.length === 5) {
    const [minute, hour, , , dayOfWeek] = parts;
    
    if (minute === "*" && hour === "*") return "Every minute";
    if (hour === "*") return `Every hour at minute ${minute}`;
    if (dayOfWeek !== "*") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Weekly on ${days[Number.parseInt(dayOfWeek) || 0]} at ${hour}:${minute.padStart(2, "0")}`;
    }
    return `Daily at ${hour}:${minute.padStart(2, "0")}`;
  }
  
  return cronExpression;
}

/**
 * Calculate next run time based on cron expression
 */
export function calculateNextRun(cronExpression: string, fromDate: Date = new Date()): Date {
  // This is a simplified implementation
  // In production, use a library like 'cron-parser' or 'node-cron'
  
  const parts = cronExpression.split(" ");
  const [minute, hour, , , ] = parts.map((p) => (p === "*" ? null : Number.parseInt(p)));
  
  const nextRun = new Date(fromDate);
  
  if (minute !== null) nextRun.setMinutes(minute);
  if (hour !== null) nextRun.setHours(hour);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);
  
  // If the calculated time is in the past, add a day
  if (nextRun <= fromDate) {
    if (hour === null) {
      // Hourly - add 1 hour
      nextRun.setHours(nextRun.getHours() + 1);
    } else {
      // Daily - add 1 day
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }
  
  return nextRun;
}

/**
 * Validate cron expression
 */
export function validateCronExpression(cronExpression: string): { valid: boolean; error?: string } {
  const parts = cronExpression.trim().split(/\s+/);
  
  if (parts.length !== 5) {
    return { valid: false, error: "Cron expression must have 5 parts (minute hour day month weekday)" };
  }
  
  // Basic validation for each part
  const [minute, hour, day, month, weekday] = parts;
  
  const isValidPart = (part: string, min: number, max: number) => {
    if (part === "*") return true;
    const num = Number.parseInt(part);
    return !Number.isNaN(num) && num >= min && num <= max;
  };
  
  if (!isValidPart(minute, 0, 59)) {
    return { valid: false, error: "Invalid minute (0-59)" };
  }
  if (!isValidPart(hour, 0, 23)) {
    return { valid: false, error: "Invalid hour (0-23)" };
  }
  if (!isValidPart(day, 1, 31)) {
    return { valid: false, error: "Invalid day (1-31)" };
  }
  if (!isValidPart(month, 1, 12)) {
    return { valid: false, error: "Invalid month (1-12)" };
  }
  if (!isValidPart(weekday, 0, 6)) {
    return { valid: false, error: "Invalid weekday (0-6)" };
  }
  
  return { valid: true };
}

/**
 * Calculate schedule statistics from execution history
 */
export function calculateScheduleStatistics(executions: ScheduleExecution[]): ScheduleStatistics {
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.status === "success").length;
  const failedExecutions = executions.filter((e) => e.status === "failed").length;
  
  const completedExecutions = executions.filter((e) => e.duration !== undefined);
  const averageDuration =
    completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;
  
  const lastExecution = executions.length > 0 ? executions[executions.length - 1] : undefined;
  
  const uptime = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;
  
  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    averageDuration,
    lastExecutionTime: lastExecution?.startTime,
    uptime,
  };
}

/**
 * Generate schedule suggestions based on query type and complexity
 */
export function generateScheduleSuggestions(query: string): ScheduleSuggestion[] {
  const queryType = detectQueryType(query);
  const suggestions: ScheduleSuggestion[] = [];
  
  // Estimate query complexity
  const isComplex = query.length > 500 || query.toUpperCase().includes("JOIN");
  
  if (queryType === "select") {
    suggestions.push({
      frequency: "hourly",
      cronExpression: "0 * * * *",
      reason: "Lightweight read queries can run frequently",
      estimatedLoad: "low",
    });
    
    suggestions.push({
      frequency: "daily",
      cronExpression: "0 2 * * *",
      reason: "Daily reports at 2 AM (off-peak hours)",
      estimatedLoad: isComplex ? "medium" : "low",
    });
  }
  
  if (queryType === "insert" || queryType === "update" || queryType === "delete") {
    suggestions.push({
      frequency: "daily",
      cronExpression: "0 3 * * *",
      reason: "Data modifications during low-traffic hours",
      estimatedLoad: "medium",
    });
    
    suggestions.push({
      frequency: "weekly",
      cronExpression: "0 1 * * 0",
      reason: "Weekly data cleanup on Sunday at 1 AM",
      estimatedLoad: "medium",
    });
  }
  
  if (queryType === "ddl") {
    suggestions.push({
      frequency: "weekly",
      cronExpression: "0 4 * * 6",
      reason: "Schema changes during weekend maintenance window",
      estimatedLoad: "high",
    });
    
    suggestions.push({
      frequency: "monthly",
      cronExpression: "0 2 1 * *",
      reason: "Monthly maintenance on the 1st at 2 AM",
      estimatedLoad: "high",
    });
  }
  
  return suggestions;
}

/**
 * Estimate query execution time (placeholder)
 */
export function estimateQueryDuration(query: string): number {
  // This is a very rough estimate - in production, use historical data
  const baseTime = 100; // ms
  
  let multiplier = 1;
  
  if (query.toUpperCase().includes("JOIN")) multiplier += 2;
  if (query.toUpperCase().includes("GROUP BY")) multiplier += 1;
  if (query.toUpperCase().includes("ORDER BY")) multiplier += 0.5;
  if (query.length > 1000) multiplier += 1;
  
  return Math.round(baseTime * multiplier);
}

/**
 * Format schedule for display
 */
export function formatSchedule(schedule: Schedule): string {
  const description = schedule.cronExpression
    ? cronToDescription(schedule.cronExpression)
    : schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1);
  
  const status = schedule.enabled ? "Active" : "Paused";
  const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : "Not scheduled";
  
  return `${schedule.name} - ${description} - ${status} - Next: ${nextRun}`;
}

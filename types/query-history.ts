export interface QueryHistoryEntry {
  id: string;
  query: string;
  operationType: "DDL" | "DML" | "DQL" | "DCL";
  status: "success" | "error";
  executedAt: string;
  executionTimeMs?: number;
  affectedRows?: number;
  errorMessage?: string;
  tables?: string[];
}

export interface QueryHistoryFilter {
  operationType?: QueryHistoryEntry["operationType"];
  status?: QueryHistoryEntry["status"];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface QueryHistoryStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgExecutionTime: number;
  queryTypeDistribution: Record<string, number>;
}

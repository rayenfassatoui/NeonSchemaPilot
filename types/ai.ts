import type { DatabaseTableSummary } from "./file-db";

export type ConversationRole = "user" | "assistant";

export type ConversationHistoryEntry = {
  role: ConversationRole;
  content: string;
};

export type OperationCategory = "DDL" | "DML" | "DQL" | "DCL";

export type ComparisonOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in";

export type CriteriaCondition = {
  column: string;
  operator?: ComparisonOperator;
  value: unknown;
};

export type OrderByClause = {
  column: string;
  direction?: "asc" | "desc";
};

export type ColumnBlueprint = {
  name: string;
  dataType: string;
  nullable?: boolean;
  defaultValue?: unknown;
  isPrimaryKey?: boolean;
};

export type DdlCreateTableOperation = {
  type: "ddl.create_table";
  table: string;
  description?: string;
  ifExists?: "abort" | "skip" | "replace";
  columns: ColumnBlueprint[];
};

export type DdlDropTableOperation = {
  type: "ddl.drop_table";
  table: string;
  ifExists?: boolean;
};

export type DdlAddColumnOperation = {
  type: "ddl.alter_table_add_column";
  table: string;
  column: ColumnBlueprint;
  position?: number;
};

export type DdlDropColumnOperation = {
  type: "ddl.alter_table_drop_column";
  table: string;
  column: string;
};

export type DmlInsertOperation = {
  type: "dml.insert";
  table: string;
  rows: Array<Record<string, unknown>>;
};

export type DmlUpdateOperation = {
  type: "dml.update";
  table: string;
  criteria: CriteriaCondition[];
  changes: Record<string, unknown>;
};

export type DmlDeleteOperation = {
  type: "dml.delete";
  table: string;
  criteria: CriteriaCondition[];
};

export type DqlSelectOperation = {
  type: "dql.select";
  table: string;
  columns?: string[];
  criteria?: CriteriaCondition[];
  orderBy?: OrderByClause[];
  limit?: number;
};

export type DclGrantOperation = {
  type: "dcl.grant";
  role: string;
  table: string;
  privileges: string[];
  description?: string;
};

export type DclRevokeOperation = {
  type: "dcl.revoke";
  role: string;
  table: string;
  privileges: string[];
};

export type AiOperation =
  | DdlCreateTableOperation
  | DdlDropTableOperation
  | DdlAddColumnOperation
  | DdlDropColumnOperation
  | DmlInsertOperation
  | DmlUpdateOperation
  | DmlDeleteOperation
  | DqlSelectOperation
  | DclGrantOperation
  | DclRevokeOperation;

export type AiPlan = {
  thought?: string;
  finalResponse?: string;
  warnings?: string[];
  operations: AiOperation[];
};

export type QueryResultSet = {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  limit?: number;
};

export type OperationExecution = {
  id: string;
  type: AiOperation["type"];
  category: OperationCategory;
  status: "success" | "skipped" | "error";
  detail: string;
  resultSet?: QueryResultSet;
};

export type AssistantMessagePayload = {
  role: "assistant";
  content: string;
  thought?: string;
  operations: OperationExecution[];
  warnings: string[];
  snapshot: {
    meta: {
      version: number;
      revision: number;
      updatedAt: string;
    };
    tables: DatabaseTableSummary[];
    roles: Array<{
      name: string;
      description?: string;
    }>;
  };
};

export type ExecuteAiResponse = {
  message: AssistantMessagePayload;
};

export type ExecuteAiRequest = {
  message: string;
  history?: ConversationHistoryEntry[];
  connectionParam?: string;
  connectionString?: string;
};

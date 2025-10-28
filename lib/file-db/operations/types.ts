import type { CriteriaCondition, DdlAddColumnOperation, DdlCreateTableOperation, DdlDropColumnOperation, DdlDropTableOperation, DqlSelectOperation, QueryResultSet } from "@/types/ai";
import type { DatabaseFile, DatabaseTable, Privilege, RoleDefinition, TableColumnDefinition } from "@/types/file-db";

export interface OperationReplicator {
  createTable(operation: DdlCreateTableOperation, table: DatabaseTable): Promise<void>;
  dropTable(operation: DdlDropTableOperation, table: DatabaseTable): Promise<void>;
  addColumn(operation: DdlAddColumnOperation, column: TableColumnDefinition): Promise<void>;
  dropColumn(operation: DdlDropColumnOperation, table: DatabaseTable): Promise<void>;
  insert(table: DatabaseTable, rows: Array<Record<string, unknown>>): Promise<void>;
  update(
    table: DatabaseTable,
    criteria: CriteriaCondition[],
    changes: Record<string, unknown>,
  ): Promise<void>;
  delete(table: DatabaseTable, criteria: CriteriaCondition[]): Promise<void>;
  select(table: DatabaseTable, operation: DqlSelectOperation): Promise<QueryResultSet>;
  grant(table: DatabaseTable, roleName: string, privileges: Privilege[], description?: string): Promise<void>;
  revoke(table: DatabaseTable, roleName: string, privileges: Privilege[]): Promise<void>;
}

export interface OperationContext {
  state: DatabaseFile;
  markDirty(): void;
  requireTable(name: string): DatabaseTable;
  ensureRole(name: string, description?: string): RoleDefinition;
  replicator?: OperationReplicator;
}

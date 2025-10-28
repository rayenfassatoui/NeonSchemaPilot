import type { DatabaseFile, DatabaseTable, RoleDefinition } from "@/types/file-db";

export interface OperationContext {
  state: DatabaseFile;
  markDirty(): void;
  requireTable(name: string): DatabaseTable;
  ensureRole(name: string, description?: string): RoleDefinition;
}

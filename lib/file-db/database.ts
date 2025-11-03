import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { AiOperation, OperationExecution } from "@/types/ai";
import type {
  DatabaseFile,
  DatabaseTable,
  DatabaseTableSummary,
  RoleDefinition,
} from "@/types/file-db";

import { DEFAULT_DB_VERSION } from "./constants";
import { formatPromptDigest, nowIso, summarizeTable } from "./helpers";
import { executeGrant, executeRevoke } from "./operations/dcl";
import { executeAddColumn, executeCreateTable, executeDropColumn, executeDropTable } from "./operations/ddl";
import { executeDelete, executeInsert, executeUpdate } from "./operations/dml";
import { executeSelect } from "./operations/dql";
import type { OperationContext, OperationReplicator } from "./operations/types";
import { getQueryHistoryManager } from "../query-history";

type OperationExecutorMap = {
  [K in AiOperation["type"]]: (
    operation: Extract<AiOperation, { type: K }> ,
    context: OperationContext,
  ) => Promise<OperationExecution>;
};

const OPERATION_EXECUTORS: OperationExecutorMap = {
  "ddl.create_table": executeCreateTable,
  "ddl.drop_table": executeDropTable,
  "ddl.alter_table_add_column": executeAddColumn,
  "ddl.alter_table_drop_column": executeDropColumn,
  "dml.insert": executeInsert,
  "dml.update": executeUpdate,
  "dml.delete": executeDelete,
  "dql.select": executeSelect,
  "dcl.grant": executeGrant,
  "dcl.revoke": executeRevoke,
};

export class FileDatabase {
  private data: DatabaseFile | null = null;
  private dirty = false;

  constructor(private readonly filePath: string) {}

  async load(options?: { replicator?: OperationReplicator }) {
    const replicator = options?.replicator;

    if (replicator) {
      try {
        const snapshot = await replicator.snapshot();
        this.data = snapshot;
        this.dirty = false;
        return;
      } catch (error) {
        console.warn("Failed to hydrate from Neon; falling back to local snapshot.", error);
      }
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      this.data = JSON.parse(raw) as DatabaseFile;
      this.dirty = false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.initializeEmpty();
      } else {
        throw error;
      }
    }
  }

  async save() {
    const state = this.state;
    if (!this.dirty) {
      return;
    }
    await this.persist(state);
    this.dirty = false;
  }

  getSummary(): {
    meta: DatabaseFile["meta"];
    tables: DatabaseTableSummary[];
    roles: Array<Pick<RoleDefinition, "name" | "description">>;
  } {
    const state = this.state;
    return {
      meta: state.meta,
      tables: Object.values(state.tables).map((table) => summarizeTable(table)),
      roles: Object.values(state.roles).map((role) => ({
        name: role.name,
        description: role.description,
      })),
    };
  }

  getPromptDigest(maxRows = 2) {
    return formatPromptDigest(this.state, maxRows);
  }

  async executeOperation(
    operation: AiOperation,
    options?: { replicator?: OperationReplicator },
  ): Promise<OperationExecution> {
    const handler = OPERATION_EXECUTORS[operation.type];
    if (!handler) {
      throw new Error(`Unsupported operation type: ${operation.type}`);
    }
    
    const startTime = Date.now();
    let result: OperationExecution;
    
    try {
      result = await handler(operation as never, this.createOperationContext(options?.replicator));
      const executionTime = Date.now() - startTime;
      
      // Log to query history
      const historyManager = getQueryHistoryManager();
      const operationType = operation.type.split('.')[0].toUpperCase() as "DDL" | "DML" | "DQL" | "DCL";
      
      await historyManager.addEntry({
        query: this.getOperationQuery(operation),
        operationType,
        status: result.status === "error" ? "error" : "success",
        executionTimeMs: executionTime,
        affectedRows: result.resultSet?.rowCount,
        errorMessage: result.status === "error" ? result.detail : undefined,
        tables: this.getOperationTables(operation),
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log error to query history
      const historyManager = getQueryHistoryManager();
      const operationType = operation.type.split('.')[0].toUpperCase() as "DDL" | "DML" | "DQL" | "DCL";
      
      await historyManager.addEntry({
        query: this.getOperationQuery(operation),
        operationType,
        status: "error",
        executionTimeMs: executionTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        tables: this.getOperationTables(operation),
      });
      
      throw error;
    }
  }

  private getOperationQuery(operation: AiOperation): string {
    // Generate a readable query string from the operation
    switch (operation.type) {
      case "ddl.create_table":
        return `CREATE TABLE ${operation.table} (${operation.columns.map(c => `${c.name} ${c.dataType}`).join(", ")})`;
      case "ddl.drop_table":
        return `DROP TABLE ${operation.table}`;
      case "ddl.alter_table_add_column":
        return `ALTER TABLE ${operation.table} ADD COLUMN ${operation.column.name} ${operation.column.dataType}`;
      case "ddl.alter_table_drop_column":
        return `ALTER TABLE ${operation.table} DROP COLUMN ${operation.column}`;
      case "dml.insert":
        return `INSERT INTO ${operation.table} VALUES (${operation.rows.length} rows)`;
      case "dml.update":
        return `UPDATE ${operation.table} SET ${Object.keys(operation.changes).join(", ")} WHERE ${operation.criteria.length} conditions`;
      case "dml.delete":
        return `DELETE FROM ${operation.table} WHERE ${operation.criteria.length} conditions`;
      case "dql.select":
        return `SELECT ${operation.columns?.join(", ") || "*"} FROM ${operation.table}${operation.criteria ? ` WHERE ${operation.criteria.length} conditions` : ""}`;
      case "dcl.grant":
        return `GRANT ${operation.privileges.join(", ")} ON ${operation.table} TO ${operation.role}`;
      case "dcl.revoke":
        return `REVOKE ${operation.privileges.join(", ")} ON ${operation.table} FROM ${operation.role}`;
      default:
        return JSON.stringify(operation);
    }
  }

  private getOperationTables(operation: AiOperation): string[] {
    const tables: string[] = [];
    if ("table" in operation && operation.table) {
      tables.push(operation.table);
    }
    return tables;
  }

  private async initializeEmpty() {
    const fresh: DatabaseFile = {
      meta: {
        version: DEFAULT_DB_VERSION,
        revision: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      tables: {},
      roles: {
        admin: {
          name: "admin",
          description: "Full access to every table and privilege.",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      },
    };
    await this.persist(fresh);
    this.data = fresh;
  }

  private async persist(payload: DatabaseFile) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf8");
  }

  private get state(): DatabaseFile {
    if (!this.data) {
      throw new Error("Database not loaded.");
    }
    return this.data;
  }

  private markDirty() {
    const state = this.state;
    this.dirty = true;
    state.meta.revision += 1;
    state.meta.updatedAt = nowIso();
  }

  private requireTable(name: string): DatabaseTable {
    const table = this.state.tables[name];
    if (!table) {
      throw new Error(`Table "${name}" does not exist.`);
    }
    return table;
  }

  private ensureRole(name: string, description?: string): RoleDefinition {
    const state = this.state;
    const existing = state.roles[name];
    if (existing) {
      if (description && description !== existing.description) {
        existing.description = description;
        existing.updatedAt = nowIso();
      }
      return existing;
    }

    const created: RoleDefinition = {
      name,
      description,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.roles[name] = created;
    return created;
  }

  private createOperationContext(replicator?: OperationReplicator): OperationContext {
    return {
      state: this.state,
      markDirty: () => this.markDirty(),
      requireTable: (name) => this.requireTable(name),
      ensureRole: (name, description) => this.ensureRole(name, description),
      replicator,
    };
  }
}

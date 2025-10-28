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
import type { OperationContext } from "./operations/types";

type OperationExecutorMap = {
  [K in AiOperation["type"]]: (
    operation: Extract<AiOperation, { type: K }> ,
    context: OperationContext,
  ) => OperationExecution;
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

  async load() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.data = JSON.parse(raw) as DatabaseFile;
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

  executeOperation(operation: AiOperation): OperationExecution {
    const handler = OPERATION_EXECUTORS[operation.type];
    if (!handler) {
      throw new Error(`Unsupported operation type: ${operation.type}`);
    }
    return handler(operation as never, this.createOperationContext());
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
        this.dirty = true;
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
    this.dirty = true;
    return created;
  }

  private createOperationContext(): OperationContext {
    return {
      state: this.state,
      markDirty: () => this.markDirty(),
      requireTable: (name) => this.requireTable(name),
      ensureRole: (name, description) => this.ensureRole(name, description),
    };
  }
}

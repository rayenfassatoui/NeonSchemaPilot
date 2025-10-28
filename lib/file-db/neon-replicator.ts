import { neon } from "@neondatabase/serverless";
import type { FullQueryResults } from "@neondatabase/serverless";

import type {
    CriteriaCondition,
    DdlAddColumnOperation,
    DdlCreateTableOperation,
    DdlDropColumnOperation,
    DdlDropTableOperation,
    DqlSelectOperation,
    QueryResultSet,
} from "@/types/ai";
import type { DatabaseTable, Privilege, TableColumnDefinition } from "@/types/file-db";

import type { OperationReplicator } from "./operations/types";

type NeonClient = ReturnType<typeof neon>;

type WhereClause = {
  clause: string;
  params: unknown[];
  nextIndex: number;
};

export class NeonOperationReplicator implements OperationReplicator {
  static async create(connectionString: string, schema = "public") {
    const client = neon(connectionString, { fullResults: true }) as NeonClient;
    await client`select 1`;
    return new NeonOperationReplicator(client, schema);
  }

  private readonly schema: string;
  private readonly sql: NeonClient;
  private inTransaction = false;

  private constructor(sql: NeonClient, schema: string) {
    this.sql = sql;
    this.schema = schema;
  }

  async begin() {
    if (this.inTransaction) return;
    await this.sql`begin`;
    this.inTransaction = true;
  }

  async commit() {
    if (!this.inTransaction) return;
    await this.sql`commit`;
    this.inTransaction = false;
  }

  async rollback() {
    if (!this.inTransaction) return;
    await this.sql`rollback`;
    this.inTransaction = false;
  }

  async createTable(operation: DdlCreateTableOperation, table: DatabaseTable) {
    const definition = table.columnOrder
      .map((columnName) => buildColumnDefinition(table.columns[columnName]))
      .join(",\n  ");

  const prefix = operation.ifExists === "skip" ? "CREATE TABLE IF NOT EXISTS" : "CREATE TABLE";
    const statement = `${prefix} ${this.tableIdentifier(table.name)} (\n  ${definition}\n)`;
    await this.sql.unsafe(statement);
  }

  async dropTable(operation: DdlDropTableOperation, table: DatabaseTable) {
  const keyword = operation.ifExists ? "IF EXISTS " : "";
  await this.sql.unsafe(`DROP TABLE ${keyword}${this.tableIdentifier(table.name)}`);
  }

  async addColumn(operation: DdlAddColumnOperation, column: TableColumnDefinition) {
    await this.sql.unsafe(
        `ALTER TABLE ${this.tableIdentifier(operation.table)} ADD COLUMN ${buildColumnDefinition(column)}`,
    );
  }

  async dropColumn(operation: DdlDropColumnOperation, table: DatabaseTable) {
    await this.sql.unsafe(
        `ALTER TABLE ${this.tableIdentifier(table.name)} DROP COLUMN ${quoteIdentifier(operation.column)}`,
    );
  }

  async insert(table: DatabaseTable, rows: Array<Record<string, unknown>>) {
    if (!rows.length) return;

    const columns = table.columnOrder;
    const columnList = columns.map(quoteIdentifier).join(", ");
    const valueClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const row of rows) {
      const placeholders = columns.map(() => `$${index++}`);
      valueClauses.push(`(${placeholders.join(", ")})`);
      for (const column of columns) {
        values.push(row[column]);
      }
    }

      const statement = `INSERT INTO ${this.tableIdentifier(table.name)} (${columnList}) VALUES ${valueClauses.join(", ")}`;
    await this.sql.query(statement, values);
  }

  async update(
    table: DatabaseTable,
    criteria: CriteriaCondition[],
    changes: Record<string, unknown>,
  ) {
    const changeEntries = Object.entries(changes);
    if (!changeEntries.length) {
      return;
    }

    const setParts: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const [column, value] of changeEntries) {
      setParts.push(`${quoteIdentifier(column)} = $${index}`);
      values.push(value);
      index += 1;
    }

    const where = buildWhereClause(criteria, index);
    values.push(...where.params);

      const statement = `UPDATE ${this.tableIdentifier(table.name)} SET ${setParts.join(", ")}${where.clause}`;
    await this.sql.query(statement, values);
  }

  async delete(table: DatabaseTable, criteria: CriteriaCondition[]) {
    const where = buildWhereClause(criteria, 1);
      const statement = `DELETE FROM ${this.tableIdentifier(table.name)}${where.clause}`;
    await this.sql.query(statement, where.params);
  }

  async select(table: DatabaseTable, operation: DqlSelectOperation): Promise<QueryResultSet> {
    const projectedColumns = operation.columns?.length
      ? operation.columns
      : table.columnOrder.slice();
    const columnList = projectedColumns.map(quoteIdentifier).join(", ");
    const limit = Math.min(Math.max(operation.limit ?? 25, 1), 200);

    const where = buildWhereClause(operation.criteria ?? [], 1);
    const orderClause = buildOrderClause(operation.orderBy);

    const values = [...where.params, limit];
    const limitPlaceholder = `$${values.length}`;

      const query = `SELECT ${columnList} FROM ${this.tableIdentifier(table.name)}${where.clause}${orderClause} LIMIT ${limitPlaceholder}`;
    const rowsResult = (await this.sql.query(query, values)) as FullQueryResults<false>;

      const countQuery = `SELECT count(*)::bigint as total FROM ${this.tableIdentifier(table.name)}${where.clause}`;
    const countResult = (await this.sql.query(countQuery, where.params)) as FullQueryResults<false>;
    const totalCandidate = countResult.rows[0]?.total;
    const total = typeof totalCandidate === "bigint" || typeof totalCandidate === "number"
      ? Number(totalCandidate)
      : rowsResult.rowCount ?? rowsResult.rows.length;

    const rows = rowsResult.rows.map((row) => {
      const next: Record<string, unknown> = {};
      for (const column of projectedColumns) {
        next[column] = (row as Record<string, unknown>)[column];
      }
      return next;
    });

    return {
      title: `Query on ${table.name}`,
      columns: projectedColumns,
      rows,
      rowCount: total,
      limit,
    };
  }

  async grant(
    table: DatabaseTable,
    roleName: string,
    privileges: Privilege[],
    description?: string,
  ) {
    await this.ensureRoleExists(roleName, description);
    const privilegeList = privileges.map((privilege) => privilege.toUpperCase()).join(", ");
    await this.sql.unsafe(
      `GRANT ${privilegeList} ON TABLE ${this.tableIdentifier(table.name)} TO ${quoteIdentifier(roleName)}`,
    );
  }

  async revoke(table: DatabaseTable, roleName: string, privileges: Privilege[]) {
    const privilegeList = privileges.map((privilege) => privilege.toUpperCase()).join(", ");
    await this.sql.unsafe(
      `REVOKE ${privilegeList} ON TABLE ${this.tableIdentifier(table.name)} FROM ${quoteIdentifier(roleName)}`,
    );
  }

  private tableIdentifier(name: string) {
    if (name.includes(".")) {
      const [schemaPart, tablePart] = name.split(".", 2);
      return `${quoteIdentifier(schemaPart)}.${quoteIdentifier(tablePart)}`;
    }
    return `${quoteIdentifier(this.schema)}.${quoteIdentifier(name)}`;
  }

  private async ensureRoleExists(roleName: string, description?: string) {
    const escapedName = escapeLiteral(roleName);
    await this.sql.unsafe(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${escapedName}') then
          execute 'create role ${quoteIdentifier(roleName)}';
        end if;
      end
      $$;
    `);

    if (description) {
      await this.sql.unsafe(
        `comment on role ${quoteIdentifier(roleName)} is '${escapeLiteral(description)}'`,
      );
    }
  }
 }

function buildColumnDefinition(column: TableColumnDefinition) {
  const parts = [quoteIdentifier(column.name), column.dataType];
  if (!column.nullable) {
    parts.push("not null");
  }
  if (column.defaultValue !== undefined) {
    parts.push(`default ${formatDefaultValue(column.defaultValue)}`);
  }
  if (column.isPrimaryKey) {
    parts.push("primary key");
  }
  return parts.join(" ");
}

function buildOrderClause(
  orderBy: DqlSelectOperation["orderBy"],
) {
  if (!orderBy?.length) {
    return "";
  }
  const segments = orderBy.map((entry) => {
    const direction = entry.direction?.toLowerCase() === "desc" ? "DESC" : "ASC";
    return `${quoteIdentifier(entry.column)} ${direction}`;
  });
  return ` order by ${segments.join(", ")}`;
}

function buildWhereClause(criteria: CriteriaCondition[] | undefined, startIndex: number): WhereClause {
  if (!criteria?.length) {
    return { clause: "", params: [], nextIndex: startIndex };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let index = startIndex;

  for (const condition of criteria) {
    const column = quoteIdentifier(condition.column);
    const operator = condition.operator ?? "eq";
    switch (operator) {
      case "eq":
        parts.push(`${column} = $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "neq":
        parts.push(`${column} <> $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "gt":
        parts.push(`${column} > $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "gte":
        parts.push(`${column} >= $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "lt":
        parts.push(`${column} < $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "lte":
        parts.push(`${column} <= $${index}`);
        params.push(condition.value);
        index += 1;
        break;
      case "contains":
        parts.push(`${column} LIKE '%' || $${index} || '%'`);
        params.push(String(condition.value ?? ""));
        index += 1;
        break;
      case "in": {
        const list = Array.isArray(condition.value)
          ? condition.value
          : [condition.value];
        if (!list.length) {
          parts.push("FALSE");
          break;
        }
        const placeholders = list.map(() => `$${index++}`);
        parts.push(`${column} IN (${placeholders.join(", ")})`);
        params.push(...list);
        break;
      }
      default:
        parts.push(`${column} = $${index}`);
        params.push(condition.value);
        index += 1;
        break;
    }
  }

  return {
    clause: ` WHERE ${parts.join(" AND ")}`,
    params,
    nextIndex: index,
  };
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function escapeLiteral(literal: string) {
  return literal.replace(/'/g, "''");
}

function formatDefaultValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string") {
    return `'${escapeLiteral(value)}'`;
  }
  return `'${escapeLiteral(JSON.stringify(value))}'::jsonb`;
}

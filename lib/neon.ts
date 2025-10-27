import { neon } from "@neondatabase/serverless";

import type {
    ColumnInfo,
    DatabaseSnapshot,
    DescribeResponse,
    TableInfo,
} from "@/types/neon";

export function isValidConnectionString(connectionString: string) {
  return (
    connectionString.startsWith("postgres://") ||
    connectionString.startsWith("postgresql://")
  );
}

function buildSqlPreview(snapshot: DatabaseSnapshot) {
  if (!snapshot.tables.length) {
    return "-- No user-defined tables discovered.";
  }

  const head = snapshot.tables.slice(0, 3);
  const chunks = head.map((table) => {
    if (!table.columns.length) {
      return `-- ${table.schema}.${table.name} (0 columns)`;
    }

    const columnLines = table.columns.map((column) => {
      const defaultValue = column.defaultValue
        ? ` default ${column.defaultValue.trim()}`
        : "";
      const nullability = column.nullable ? "" : " not null";
      return `  "${column.name}" ${column.dataType}${nullability}${defaultValue}`;
    });

    return [
      `-- ${table.schema}.${table.name} (${table.columns.length} columns)`,
      `create table "${table.schema}"."${table.name}" (`,
      columnLines.join(",\n"),
      ");",
    ].join("\n");
  });

  if (snapshot.tables.length > head.length) {
    chunks.push(
      `-- …and ${snapshot.tables.length - head.length} more table(s) detected.`
    );
  }

  return chunks.join("\n\n");
}

export async function describeDatabase(
  connectionString: string
): Promise<DescribeResponse> {
  if (!connectionString) {
    throw new Error("Missing connection string.");
  }

  if (!isValidConnectionString(connectionString)) {
    throw new Error("Please provide a valid Postgres connection string.");
  }

  const sql = neon(connectionString);

  const [tablesRaw, columnsRaw] = await Promise.all([
    sql`
      select table_schema as "tableSchema", table_name as "tableName"
      from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name
    `,
    sql`
      select
        table_schema as "tableSchema",
        table_name as "tableName",
        column_name as "columnName",
        data_type as "dataType",
        is_nullable as "isNullable",
        column_default as "columnDefault"
      from information_schema.columns
      where table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name, ordinal_position
    `,
  ]);

  const tables = tablesRaw as Array<{
    tableSchema: string;
    tableName: string;
  }>;

  const columns = columnsRaw as Array<{
    tableSchema: string;
    tableName: string;
    columnName: string;
    dataType: string;
    isNullable: "YES" | "NO";
    columnDefault: string | null;
  }>;

  const tableMap = new Map<string, TableInfo>();

  for (const table of tables) {
    const key = `${table.tableSchema}.${table.tableName}`;
    tableMap.set(key, {
      schema: table.tableSchema,
      name: table.tableName,
      columns: [],
    });
  }

  for (const column of columns) {
    const key = `${column.tableSchema}.${column.tableName}`;
    const entry = tableMap.get(key);
    if (!entry) continue;

    const columnInfo: ColumnInfo = {
      name: column.columnName,
      dataType: column.dataType,
      nullable: column.isNullable === "YES",
      defaultValue: column.columnDefault,
    };

    entry.columns.push(columnInfo);
  }

  const snapshot: DatabaseSnapshot = {
    tables: Array.from(tableMap.values()),
    tableCount: tableMap.size,
    columnCount: columns.length,
  };

  return {
    snapshot,
    sqlPreview: buildSqlPreview(snapshot),
  };
}

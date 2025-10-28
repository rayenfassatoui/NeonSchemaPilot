export type Privilege =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "alter"
  | "drop"
  | "manage_permissions";

export type TableColumnDefinition = {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: unknown;
  isPrimaryKey?: boolean;
};

export type TablePermission = {
  role: string;
  privileges: Privilege[];
  grantedAt: string;
};

export type DatabaseTable = {
  name: string;
  description?: string;
  primaryKey?: string;
  columns: Record<string, TableColumnDefinition>;
  columnOrder: string[];
  permissions: Record<string, TablePermission>;
  rows: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
};

export type RoleDefinition = {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type DatabaseFile = {
  meta: {
    version: number;
    revision: number;
    createdAt: string;
    updatedAt: string;
  };
  tables: Record<string, DatabaseTable>;
  roles: Record<string, RoleDefinition>;
};

export type DatabaseTableSummary = {
  name: string;
  description?: string;
  primaryKey?: string;
  columnCount: number;
  rowCount: number;
  updatedAt: string;
  columns: TableColumnDefinition[];
  permissions: Array<{
    role: string;
    privileges: Privilege[];
  }>;
};

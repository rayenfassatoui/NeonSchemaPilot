export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
}

export interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
}

export interface DatabaseSnapshot {
  tables: TableInfo[];
  tableCount: number;
  columnCount: number;
}

export interface DescribeResponse {
  snapshot: DatabaseSnapshot;
  sqlPreview: string;
}

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

export interface RelationEdge {
  constraintName: string;
  source: {
    schema: string;
    table: string;
    column: string;
  };
  target: {
    schema: string;
    table: string;
    column: string;
  };
}

export interface DatabaseSnapshot {
  tables: TableInfo[];
  tableCount: number;
  columnCount: number;
  relations: RelationEdge[];
}

export interface DescribeResponse {
  snapshot: DatabaseSnapshot;
  sqlPreview: string;
}

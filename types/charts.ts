export type ChartType = 
  | "bar" 
  | "line" 
  | "pie" 
  | "donut"
  | "area" 
  | "scatter"
  | "radar";

export type AggregationType = 
  | "count" 
  | "sum" 
  | "avg" 
  | "min" 
  | "max"
  | "distinct";

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  tableName: string;
  xAxis?: {
    column: string;
    label?: string;
  };
  yAxis?: {
    column: string;
    aggregation?: AggregationType;
    label?: string;
  };
  groupBy?: string;
  filters?: Array<{
    column: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";
    value: unknown;
  }>;
  limit?: number;
  colors?: string[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  [key: string]: unknown;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface ChartInsight {
  type: "trend" | "outlier" | "summary" | "comparison";
  title: string;
  description: string;
  value?: string | number;
  change?: number;
}

export interface ChartResponse {
  config: ChartConfig;
  data: ChartData;
  insights: ChartInsight[];
  metadata: {
    totalRecords: number;
    dataPoints: number;
    generatedAt: string;
  };
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  columnCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
}

export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: ChartType;
  requiredColumns: {
    types: Array<"numeric" | "categorical" | "date">;
    count: number;
  };
  generate: (tableName: string, columns: string[]) => ChartConfig;
}

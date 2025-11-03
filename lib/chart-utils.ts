import type {
    ChartConfig,
    ChartData,
    ChartDataPoint,
    ChartInsight,
    AggregationType,
    TableStats,
} from "@/types/charts";

/**
 * Aggregate data based on aggregation type
 */
export function aggregateData(
  data: Array<Record<string, unknown>>,
  column: string,
  aggregation: AggregationType
): number {
  const values = data
    .map((row) => row[column])
    .filter((val) => val !== null && val !== undefined);

  switch (aggregation) {
    case "count":
      return values.length;
    case "distinct":
      return new Set(values).size;
    case "sum":
      return values.reduce((acc: number, val) => acc + Number(val || 0), 0);
    case "avg":
      if (values.length === 0) return 0;
      return values.reduce((acc: number, val) => acc + Number(val || 0), 0) / values.length;
    case "min":
      return Math.min(...values.map((v) => Number(v || 0)));
    case "max":
      return Math.max(...values.map((v) => Number(v || 0)));
    default:
      return 0;
  }
}

/**
 * Group data by a column and aggregate
 */
export function groupAndAggregate(
  data: Array<Record<string, unknown>>,
  groupBy: string,
  valueColumn: string,
  aggregation: AggregationType
): ChartDataPoint[] {
  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const row of data) {
    const key = String(row[groupBy] ?? "Unknown");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return Array.from(groups.entries()).map(([label, groupData]) => ({
    label,
    value: aggregateData(groupData, valueColumn, aggregation),
  }));
}

/**
 * Convert chart data points to Chart.js format
 */
export function toChartData(
  dataPoints: ChartDataPoint[],
  config: ChartConfig
): ChartData {
  const labels = dataPoints.map((d) => d.label);
  const values = dataPoints.map((d) => d.value);

  const defaultColors = [
    "rgba(59, 130, 246, 0.8)",  // blue
    "rgba(16, 185, 129, 0.8)",   // green
    "rgba(245, 158, 11, 0.8)",   // amber
    "rgba(239, 68, 68, 0.8)",    // red
    "rgba(139, 92, 246, 0.8)",   // violet
    "rgba(236, 72, 153, 0.8)",   // pink
    "rgba(20, 184, 166, 0.8)",   // teal
    "rgba(251, 146, 60, 0.8)",   // orange
  ];

  const colors = config.colors || defaultColors;
  const isPieOrDonut = config.type === "pie" || config.type === "donut";

  return {
    labels,
    datasets: [
      {
        label: config.yAxis?.label || "Value",
        data: values,
        backgroundColor: isPieOrDonut ? colors : colors[0],
        borderColor: isPieOrDonut
          ? colors.map((c) => c.replace("0.8", "1"))
          : colors[0].replace("0.8", "1"),
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Generate insights from chart data
 */
export function generateInsights(
  dataPoints: ChartDataPoint[],
  config: ChartConfig
): ChartInsight[] {
  const insights: ChartInsight[] = [];

  if (dataPoints.length === 0) {
    return insights;
  }

  const values = dataPoints.map((d) => d.value);
  const total = values.reduce((acc, val) => acc + val, 0);
  const avg = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  // Summary insight
  insights.push({
    type: "summary",
    title: "Total",
    description: `Across all ${dataPoints.length} data points`,
    value: formatNumber(total),
  });

  insights.push({
    type: "summary",
    title: "Average",
    description: `Mean value per data point`,
    value: formatNumber(avg),
  });

  // Find highest value
  const maxPoint = dataPoints.find((d) => d.value === max);
  if (maxPoint) {
    insights.push({
      type: "comparison",
      title: "Highest",
      description: `${maxPoint.label} has the maximum value`,
      value: formatNumber(max),
    });
  }

  // Find lowest value
  const minPoint = dataPoints.find((d) => d.value === min);
  if (minPoint && min !== max) {
    insights.push({
      type: "comparison",
      title: "Lowest",
      description: `${minPoint.label} has the minimum value`,
      value: formatNumber(min),
    });
  }

  // Detect outliers (values > 2 standard deviations from mean)
  const stdDev = Math.sqrt(
    values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length
  );

  const outliers = dataPoints.filter(
    (d) => Math.abs(d.value - avg) > 2 * stdDev
  );

  if (outliers.length > 0 && dataPoints.length > 3) {
    insights.push({
      type: "outlier",
      title: "Outliers Detected",
      description: `${outliers.length} data points significantly deviate from the average`,
      value: outliers.map((o) => o.label).join(", "),
    });
  }

  return insights;
}

/**
 * Analyze table structure to determine available chart types
 */
export function analyzeTableStructure(
  columns: Array<{ name: string; dataType: string }>
): TableStats {
  const numericTypes = ["integer", "bigint", "smallint", "decimal", "numeric", "real", "double", "float"];
  const dateTypes = ["date", "timestamp", "timestamptz", "time"];

  const numericColumns = columns
    .filter((c) => numericTypes.some((t) => c.dataType.toLowerCase().includes(t)))
    .map((c) => c.name);

  const dateColumns = columns
    .filter((c) => dateTypes.some((t) => c.dataType.toLowerCase().includes(t)))
    .map((c) => c.name);

  const categoricalColumns = columns
    .filter((c) => !numericColumns.includes(c.name) && !dateColumns.includes(c.name))
    .map((c) => c.name);

  return {
    tableName: "",
    rowCount: 0,
    columnCount: columns.length,
    numericColumns,
    categoricalColumns,
    dateColumns,
  };
}

/**
 * Suggest chart configurations based on table structure
 */
export function suggestCharts(
  tableName: string,
  stats: TableStats,
  data: Array<Record<string, unknown>>
): ChartConfig[] {
  const suggestions: ChartConfig[] = [];

  // Bar chart: categorical x numeric
  if (stats.categoricalColumns.length > 0 && stats.numericColumns.length > 0) {
    suggestions.push({
      id: `bar-${tableName}-1`,
      title: `${stats.numericColumns[0]} by ${stats.categoricalColumns[0]}`,
      type: "bar",
      tableName,
      xAxis: { column: stats.categoricalColumns[0], label: stats.categoricalColumns[0] },
      yAxis: {
        column: stats.numericColumns[0],
        aggregation: "sum",
        label: stats.numericColumns[0],
      },
      groupBy: stats.categoricalColumns[0],
      limit: 10,
    });
  }

  // Pie chart: distribution of categorical data
  if (stats.categoricalColumns.length > 0) {
    suggestions.push({
      id: `pie-${tableName}-1`,
      title: `Distribution of ${stats.categoricalColumns[0]}`,
      type: "pie",
      tableName,
      groupBy: stats.categoricalColumns[0],
      yAxis: { column: stats.categoricalColumns[0], aggregation: "count" },
      limit: 8,
    });
  }

  // Line chart: trend over time
  if (stats.dateColumns.length > 0 && stats.numericColumns.length > 0) {
    suggestions.push({
      id: `line-${tableName}-1`,
      title: `${stats.numericColumns[0]} over time`,
      type: "line",
      tableName,
      xAxis: { column: stats.dateColumns[0], label: "Date" },
      yAxis: {
        column: stats.numericColumns[0],
        aggregation: "avg",
        label: stats.numericColumns[0],
      },
      groupBy: stats.dateColumns[0],
    });
  }

  // Count chart: simple row count
  suggestions.push({
    id: `bar-${tableName}-count`,
    title: `Total Records in ${tableName}`,
    type: "bar",
    tableName,
    xAxis: { column: tableName, label: "Table" },
    yAxis: { column: "*", aggregation: "count", label: "Count" },
  });

  return suggestions;
}

/**
 * Apply filters to data
 */
export function applyFilters(
  data: Array<Record<string, unknown>>,
  filters: ChartConfig["filters"]
): Array<Record<string, unknown>> {
  if (!filters || filters.length === 0) return data;

  return data.filter((row) => {
    return filters.every((filter) => {
      const value = row[filter.column];
      const filterValue = filter.value;

      switch (filter.operator) {
        case "eq":
          return value == filterValue;
        case "neq":
          return value != filterValue;
        case "gt":
          return Number(value) > Number(filterValue);
        case "gte":
          return Number(value) >= Number(filterValue);
        case "lt":
          return Number(value) < Number(filterValue);
        case "lte":
          return Number(value) <= Number(filterValue);
        case "contains":
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        default:
          return true;
      }
    });
  });
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  if (num % 1 !== 0) {
    return num.toFixed(2);
  }
  return num.toString();
}

/**
 * Validate chart configuration
 */
export function validateChartConfig(config: ChartConfig): string | null {
  if (!config.tableName) {
    return "Table name is required";
  }

  if (!config.type) {
    return "Chart type is required";
  }

  const needsGroupBy = ["bar", "line", "pie", "donut", "area"];
  if (needsGroupBy.includes(config.type) && !config.groupBy) {
    return "Group by column is required for this chart type";
  }

  if (config.yAxis && !config.yAxis.column) {
    return "Y-axis column is required";
  }

  return null;
}

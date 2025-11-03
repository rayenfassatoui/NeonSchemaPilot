"use client";;
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ChartResponse, ChartType } from "@/types/charts";

interface ChartViewerProps {
  chartResponse: ChartResponse;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#fb923c", // orange
];

export function ChartViewer({ chartResponse }: ChartViewerProps) {
  const { config, data, insights, metadata } = chartResponse;

  // Transform data for recharts
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0].data[index],
  }));

  const renderChart = () => {
    switch (config.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="value" fill={CHART_COLORS[0]} name={config.yAxis?.label || "Value"} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                name={config.yAxis?.label || "Value"}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                fill={CHART_COLORS[0]}
                stroke={CHART_COLORS[0]}
                fillOpacity={0.6}
                name={config.yAxis?.label || "Value"}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
      case "donut":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={config.type === "donut" ? 120 : 140}
                innerRadius={config.type === "donut" ? 60 : 0}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            Chart type not supported yet
          </div>
        );
    }
  };

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case "bar":
        return <BarChart3 className="h-5 w-5" />;
      case "line":
      case "area":
        return <LineChartIcon className="h-5 w-5" />;
      case "pie":
      case "donut":
        return <PieChartIcon className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getChartIcon(config.type)}
              <div>
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>
                  {config.tableName} · {metadata.dataPoints} data points
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="uppercase">
              {config.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {insights.map((insight, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {insight.type === "trend" && <TrendingUp className="h-4 w-4 text-blue-500" />}
                  {insight.type === "outlier" && <AlertCircle className="h-4 w-4 text-amber-500" />}
                  <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insight.value}</div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metadata */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          Generated from {metadata.totalRecords} total records at{" "}
          {new Date(metadata.generatedAt).toLocaleString()}
        </AlertDescription>
      </Alert>
    </div>
  );
}

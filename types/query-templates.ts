/**
 * Query Templates Types
 */

export type TemplateCategory = 
  | "SELECT" 
  | "INSERT" 
  | "UPDATE" 
  | "DELETE" 
  | "JOIN" 
  | "AGGREGATE" 
  | "DDL" 
  | "ANALYTICS" 
  | "CUSTOM";

export interface QueryTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  template: string; // SQL template with placeholders
  placeholders: TemplatePlaceholder[];
  tags?: string[];
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  example?: string; // Example usage
}

export interface TemplatePlaceholder {
  name: string; // e.g., "table_name", "column_name"
  type: "string" | "number" | "date" | "table" | "column" | "condition";
  description?: string;
  defaultValue?: string;
  required: boolean;
  validation?: string; // Regex pattern for validation
}

export interface TemplateExecution {
  id: string;
  templateId: string;
  templateName: string;
  filledTemplate: string; // Template with values filled in
  parameters: Record<string, any>;
  executedAt: string;
  executionTime?: number;
  success: boolean;
  error?: string;
}

export interface TemplateLibrary {
  templates: QueryTemplate[];
  categories: TemplateCategory[];
  recentlyUsed: QueryTemplate[];
  favorites: string[]; // Template IDs
}

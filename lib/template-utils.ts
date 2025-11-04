/**
 * Query Templates Utilities
 * Functions for managing and using query templates
 */

import type { QueryTemplate, TemplatePlaceholder, TemplateCategory } from "@/types/query-templates";

/**
 * Parse template and extract placeholders
 */
export function parseTemplatePlaceholders(template: string): string[] {
  // Match patterns like {{table_name}}, {{column}}, etc.
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = template.matchAll(regex);
  const placeholders = new Set<string>();

  for (const match of matches) {
    placeholders.add(match[1].trim());
  }

  return Array.from(placeholders);
}

/**
 * Fill template with provided values
 */
export function fillTemplate(
  template: string,
  values: Record<string, any>
): { filled: string; missingPlaceholders: string[] } {
  let filled = template;
  const placeholders = parseTemplatePlaceholders(template);
  const missingPlaceholders: string[] = [];

  for (const placeholder of placeholders) {
    const value = values[placeholder];
    
    if (value === undefined || value === null || value === "") {
      missingPlaceholders.push(placeholder);
    } else {
      const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, "g");
      filled = filled.replace(regex, String(value));
    }
  }

  return { filled, missingPlaceholders };
}

/**
 * Validate placeholder value against pattern
 */
export function validatePlaceholderValue(
  placeholder: TemplatePlaceholder,
  value: any
): { valid: boolean; error?: string } {
  // Check required
  if (placeholder.required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${placeholder.name} is required` };
  }

  // If not required and empty, it's valid
  if (!value) {
    return { valid: true };
  }

  // Type validation
  switch (placeholder.type) {
    case "number":
      if (isNaN(Number(value))) {
        return { valid: false, error: `${placeholder.name} must be a number` };
      }
      break;
    case "date":
      if (isNaN(Date.parse(value))) {
        return { valid: false, error: `${placeholder.name} must be a valid date` };
      }
      break;
  }

  // Regex validation
  if (placeholder.validation) {
    const regex = new RegExp(placeholder.validation);
    if (!regex.test(String(value))) {
      return { valid: false, error: `${placeholder.name} has invalid format` };
    }
  }

  return { valid: true };
}

/**
 * Get built-in query templates
 */
export function getBuiltInTemplates(): QueryTemplate[] {
  const now = new Date().toISOString();

  return [
    {
      id: "select-all",
      name: "Select All Records",
      description: "Select all records from a table",
      category: "SELECT",
      template: "SELECT * FROM {{table_name}} LIMIT {{limit}};",
      placeholders: [
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "limit",
          type: "number",
          description: "Maximum number of records",
          defaultValue: "100",
          required: false,
        },
      ],
      tags: ["basic", "select"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "SELECT * FROM users LIMIT 100;",
    },
    {
      id: "select-where",
      name: "Select with WHERE Clause",
      description: "Select records matching a condition",
      category: "SELECT",
      template: "SELECT {{columns}} FROM {{table_name}} WHERE {{condition}};",
      placeholders: [
        {
          name: "columns",
          type: "string",
          description: "Columns to select (comma-separated or *)",
          defaultValue: "*",
          required: true,
        },
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "condition",
          type: "condition",
          description: "WHERE condition",
          required: true,
        },
      ],
      tags: ["select", "filter"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "SELECT id, name FROM users WHERE age > 18;",
    },
    {
      id: "insert-single",
      name: "Insert Single Record",
      description: "Insert a single record into a table",
      category: "INSERT",
      template: "INSERT INTO {{table_name}} ({{columns}}) VALUES ({{values}});",
      placeholders: [
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "columns",
          type: "string",
          description: "Column names (comma-separated)",
          required: true,
        },
        {
          name: "values",
          type: "string",
          description: "Values (comma-separated, properly quoted)",
          required: true,
        },
      ],
      tags: ["insert", "create"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');",
    },
    {
      id: "update-where",
      name: "Update with WHERE",
      description: "Update records matching a condition",
      category: "UPDATE",
      template: "UPDATE {{table_name}} SET {{assignments}} WHERE {{condition}};",
      placeholders: [
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "assignments",
          type: "string",
          description: "Column assignments (e.g., col1 = val1, col2 = val2)",
          required: true,
        },
        {
          name: "condition",
          type: "condition",
          description: "WHERE condition",
          required: true,
        },
      ],
      tags: ["update", "modify"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "UPDATE users SET status = 'active' WHERE id = 1;",
    },
    {
      id: "delete-where",
      name: "Delete with WHERE",
      description: "Delete records matching a condition",
      category: "DELETE",
      template: "DELETE FROM {{table_name}} WHERE {{condition}};",
      placeholders: [
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "condition",
          type: "condition",
          description: "WHERE condition",
          required: true,
        },
      ],
      tags: ["delete", "remove"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "DELETE FROM users WHERE created_at < '2020-01-01';",
    },
    {
      id: "inner-join",
      name: "Inner Join",
      description: "Join two tables",
      category: "JOIN",
      template: `SELECT {{columns}}
FROM {{table1}}
INNER JOIN {{table2}} ON {{table1}}.{{join_column1}} = {{table2}}.{{join_column2}};`,
      placeholders: [
        {
          name: "columns",
          type: "string",
          description: "Columns to select",
          defaultValue: "*",
          required: true,
        },
        {
          name: "table1",
          type: "table",
          description: "First table name",
          required: true,
        },
        {
          name: "table2",
          type: "table",
          description: "Second table name",
          required: true,
        },
        {
          name: "join_column1",
          type: "column",
          description: "Join column from first table",
          required: true,
        },
        {
          name: "join_column2",
          type: "column",
          description: "Join column from second table",
          required: true,
        },
      ],
      tags: ["join", "relationship"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;",
    },
    {
      id: "count-group",
      name: "Count with GROUP BY",
      description: "Count records grouped by a column",
      category: "AGGREGATE",
      template: `SELECT {{group_column}}, COUNT(*) as count
FROM {{table_name}}
GROUP BY {{group_column}}
ORDER BY count DESC;`,
      placeholders: [
        {
          name: "table_name",
          type: "table",
          description: "Name of the table",
          required: true,
        },
        {
          name: "group_column",
          type: "column",
          description: "Column to group by",
          required: true,
        },
      ],
      tags: ["aggregate", "count", "group"],
      isPublic: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      example: "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC;",
    },
  ];
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(templates: QueryTemplate[], query: string): QueryTemplate[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description?.toLowerCase().includes(lowerQuery) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      template.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter templates by category
 */
export function filterTemplatesByCategory(
  templates: QueryTemplate[],
  categories: TemplateCategory[]
): QueryTemplate[] {
  if (categories.length === 0) return templates;
  return templates.filter((template) => categories.includes(template.category));
}

/**
 * Sort templates by different criteria
 */
export function sortTemplates(
  templates: QueryTemplate[],
  sortBy: "name" | "usage" | "date"
): QueryTemplate[] {
  const sorted = [...templates];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "usage":
      return sorted.sort((a, b) => b.usageCount - a.usageCount);
    case "date":
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    default:
      return sorted;
  }
}

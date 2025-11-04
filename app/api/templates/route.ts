/**
 * Query Templates API Route
 * Manages query templates
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { QueryTemplate, TemplateExecution } from "@/types/query-templates";
import { getBuiltInTemplates } from "@/lib/template-utils";

const TEMPLATES_FILE = path.join(process.cwd(), "data", "query-templates.json");
const EXECUTIONS_FILE = path.join(process.cwd(), "data", "template-executions.json");

// Ensure data files exist
async function ensureDataFiles() {
  const dataDir = path.join(process.cwd(), "data");
  
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  
  try {
    await fs.access(TEMPLATES_FILE);
  } catch {
    // Initialize with built-in templates
    const builtInTemplates = getBuiltInTemplates();
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(builtInTemplates, null, 2));
  }
  
  try {
    await fs.access(EXECUTIONS_FILE);
  } catch {
    await fs.writeFile(EXECUTIONS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * GET - Retrieve templates or executions
 */
export async function GET(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "templates" or "executions"
    const id = searchParams.get("id");
    const category = searchParams.get("category");
    
    if (type === "executions") {
      const content = await fs.readFile(EXECUTIONS_FILE, "utf-8");
      const executions: TemplateExecution[] = JSON.parse(content);
      
      if (id) {
        const filtered = executions.filter((e) => e.templateId === id);
        return NextResponse.json({ executions: filtered });
      }
      
      return NextResponse.json({ executions });
    }
    
    // Default: return templates
    const content = await fs.readFile(TEMPLATES_FILE, "utf-8");
    let templates: QueryTemplate[] = JSON.parse(content);
    
    // Filter by category if provided
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    
    if (id) {
      const template = templates.find((t) => t.id === id);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ template });
    }
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error retrieving templates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve templates" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new template or execution
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const { type, data } = body;
    
    if (type === "execution") {
      const execution: TemplateExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId: data.templateId,
        templateName: data.templateName,
        filledTemplate: data.filledTemplate,
        parameters: data.parameters,
        executedAt: new Date().toISOString(),
        executionTime: data.executionTime,
        success: data.success,
        error: data.error,
      };
      
      const content = await fs.readFile(EXECUTIONS_FILE, "utf-8");
      const executions: TemplateExecution[] = JSON.parse(content);
      executions.push(execution);
      
      // Keep only last 100 executions
      if (executions.length > 100) {
        executions.splice(0, executions.length - 100);
      }
      
      await fs.writeFile(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
      
      // Increment template usage count
      const templatesContent = await fs.readFile(TEMPLATES_FILE, "utf-8");
      const templates: QueryTemplate[] = JSON.parse(templatesContent);
      const templateIndex = templates.findIndex((t) => t.id === data.templateId);
      if (templateIndex !== -1) {
        templates[templateIndex].usageCount += 1;
        await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
      }
      
      return NextResponse.json({ success: true, execution });
    }
    
    // Create template
    const template: QueryTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      category: data.category,
      template: data.template,
      placeholders: data.placeholders || [],
      tags: data.tags || [],
      isPublic: data.isPublic !== false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.createdBy,
      example: data.example,
    };
    
    const content = await fs.readFile(TEMPLATES_FILE, "utf-8");
    const templates: QueryTemplate[] = JSON.parse(content);
    templates.push(template);
    
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create template" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a template
 */
export async function PUT(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const { id, updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }
    
    const content = await fs.readFile(TEMPLATES_FILE, "utf-8");
    const templates: QueryTemplate[] = JSON.parse(content);
    
    const templateIndex = templates.findIndex((t) => t.id === id);
    if (templateIndex === -1) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    Object.assign(templates[templateIndex], updates, {
      updatedAt: new Date().toISOString(),
    });
    
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return NextResponse.json({ success: true, template: templates[templateIndex] });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a template
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }
    
    const content = await fs.readFile(TEMPLATES_FILE, "utf-8");
    let templates: QueryTemplate[] = JSON.parse(content);
    
    const initialLength = templates.length;
    templates = templates.filter((t) => t.id !== id);
    
    if (templates.length === initialLength) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete template" },
      { status: 500 }
    );
  }
}

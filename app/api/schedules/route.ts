/**
 * Scheduled Queries API Route
 * Manages scheduled query operations
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Schedule, ScheduleOptions, ScheduleExecution } from "@/types/schedule";
import {
    detectQueryType,
    frequencyToCron,
    calculateNextRun,
    validateCronExpression,
    generateScheduleSuggestions,
} from "@/lib/schedule-utils";

const SCHEDULES_FILE = path.join(process.cwd(), "data", "schedules.json");
const EXECUTIONS_FILE = path.join(process.cwd(), "data", "schedule-executions.json");

// Ensure data directory and files exist
async function ensureDataFiles() {
  const dataDir = path.join(process.cwd(), "data");
  
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  
  try {
    await fs.access(SCHEDULES_FILE);
  } catch {
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(EXECUTIONS_FILE);
  } catch {
    await fs.writeFile(EXECUTIONS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * GET - Retrieve all schedules or a specific schedule
 */
export async function GET(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("id");
    const action = searchParams.get("action");
    const query = searchParams.get("query");
    
    // Get schedule suggestions
    if (action === "suggestions" && query) {
      const suggestions = generateScheduleSuggestions(query);
      return NextResponse.json({ suggestions });
    }
    
    const schedulesContent = await fs.readFile(SCHEDULES_FILE, "utf-8");
    const schedules: Schedule[] = JSON.parse(schedulesContent);
    
    if (scheduleId) {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
      
      // Get execution history for this schedule
      const executionsContent = await fs.readFile(EXECUTIONS_FILE, "utf-8");
      const allExecutions: ScheduleExecution[] = JSON.parse(executionsContent);
      const executions = allExecutions.filter((e) => e.scheduleId === scheduleId);
      
      return NextResponse.json({ schedule, executions });
    }
    
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error retrieving schedules:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve schedules" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new schedule
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const options: ScheduleOptions = body;
    
    // Validate query
    if (!options.query || options.query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    // Validate cron expression if custom
    if (options.frequency === "custom" && options.cronExpression) {
      const validation = validateCronExpression(options.cronExpression);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }
    
    const queryType = detectQueryType(options.query);
    const cronExpression = options.cronExpression || frequencyToCron(options.frequency);
    const nextRun = calculateNextRun(cronExpression);
    
    const schedule: Schedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: options.name,
      description: options.description,
      query: options.query,
      queryType,
      frequency: options.frequency,
      cronExpression,
      enabled: options.enabled !== false,
      status: "active",
      nextRun: nextRun.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Read existing schedules
    const schedulesContent = await fs.readFile(SCHEDULES_FILE, "utf-8");
    const schedules: Schedule[] = JSON.parse(schedulesContent);
    
    // Add new schedule
    schedules.push(schedule);
    
    // Save
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
    
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create schedule" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an existing schedule
 */
export async function PUT(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const { id, updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }
    
    const schedulesContent = await fs.readFile(SCHEDULES_FILE, "utf-8");
    const schedules: Schedule[] = JSON.parse(schedulesContent);
    
    const scheduleIndex = schedules.findIndex((s) => s.id === id);
    if (scheduleIndex === -1) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    
    // Update schedule
    const schedule = schedules[scheduleIndex];
    Object.assign(schedule, updates, {
      updatedAt: new Date().toISOString(),
    });
    
    // Recalculate next run if cron expression changed
    if (updates.cronExpression || updates.frequency) {
      const cronExpression = schedule.cronExpression || frequencyToCron(schedule.frequency);
      schedule.nextRun = calculateNextRun(cronExpression).toISOString();
    }
    
    // Save
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
    
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a schedule
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }
    
    const schedulesContent = await fs.readFile(SCHEDULES_FILE, "utf-8");
    let schedules: Schedule[] = JSON.parse(schedulesContent);
    
    const initialLength = schedules.length;
    schedules = schedules.filter((s) => s.id !== id);
    
    if (schedules.length === initialLength) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    
    // Save
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
    
    return NextResponse.json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete schedule" },
      { status: 500 }
    );
  }
}

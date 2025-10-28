import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { generatePlan } from "@/lib/ai/gemini";
import { FileDatabase } from "@/lib/file-db/database";
import type {
    AiOperation,
    AssistantMessagePayload,
    ConversationHistoryEntry,
    ExecuteAiRequest,
    OperationCategory,
    OperationExecution,
} from "@/types/ai";

export const runtime = "nodejs";

const DATABASE_PATH = join(process.cwd(), "data", "database.json");

function categorize(type: AiOperation["type"]): OperationCategory {
  if (type.startsWith("ddl")) return "DDL";
  if (type.startsWith("dml")) return "DML";
  if (type.startsWith("dql")) return "DQL";
  return "DCL";
}

function buildFallbackResponse(results: OperationExecution[]) {
  if (!results.length) {
    return "No changes were required for your request. Let me know how else you would like to shape the dataset.";
  }
  const summary = results
    .map((entry, index) => `${index + 1}. ${entry.detail}`)
    .join(" \n");
  return `Here is what I executed:\n${summary}`;
}

function trimHistory(history: ConversationHistoryEntry[] | undefined, maxEntries = 6) {
  if (!history?.length) return [];
  return history.slice(-maxEntries);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ExecuteAiRequest;
    const message = payload.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const database = new FileDatabase(DATABASE_PATH);
    await database.load();

    const digest = database.getPromptDigest();

    const plan = await generatePlan({
      message,
      history: trimHistory(payload.history),
      databaseDigest: digest,
    });

    const results: OperationExecution[] = [];
    const warnings = new Set(plan.warnings ?? []);

    for (const operation of plan.operations) {
      try {
        const outcome = database.executeOperation(operation);
        results.push(outcome);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error occurred.";
        results.push({
          id: randomUUID(),
          type: operation.type,
          category: categorize(operation.type),
          status: "error",
          detail,
        });
        warnings.add(detail);
        break;
      }
    }

    await database.save();
    const snapshot = database.getSummary();

    const messagePayload: AssistantMessagePayload = {
      role: "assistant",
      content: plan.finalResponse?.trim() || buildFallbackResponse(results),
      thought: plan.thought?.trim() || undefined,
      operations: results,
      warnings: Array.from(warnings),
      snapshot,
    };

    return NextResponse.json({ message: messagePayload });
  } catch (error) {
    console.error("Failed to execute AI plan", error);
    const detail = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

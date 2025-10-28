import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { generatePlan } from "@/lib/ai/gemini";
import { FileDatabase } from "@/lib/file-db/database";
import { NeonOperationReplicator } from "@/lib/file-db/neon-replicator";
import { isValidConnectionString } from "@/lib/neon";
import type {
  AiOperation,
  AiPlan,
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

function decodeConnection(parameter?: string | null) {
  if (!parameter) {
    return null;
  }

  try {
    return Buffer.from(parameter, "base64").toString("utf8").trim();
  } catch (error) {
    console.error("Failed to decode connection parameter", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ExecuteAiRequest;
    const message = payload.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (payload.confirm && !payload.plan) {
      return NextResponse.json(
        { error: "Plan payload is required when confirming changes." },
        { status: 400 },
      );
    }

    const decodedConnection =
      payload.connectionString?.trim() ?? decodeConnection(payload.connectionParam);
    const connectionString =
      decodedConnection && isValidConnectionString(decodedConnection) ? decodedConnection : null;

    const warnings = new Set<string>();
    if (!decodedConnection) {
      warnings.add("No Neon connection detected; using the local workspace snapshot instead of your live database.");
    } else if (!connectionString) {
      warnings.add(
        "Connection string couldn't be validated; ran operations against the local snapshot only.",
      );
    }

    let replicator: NeonOperationReplicator | undefined;

    if (connectionString) {
      try {
        replicator = await NeonOperationReplicator.create(connectionString);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unable to connect to Neon.";
        warnings.add(detail);
        replicator = undefined;
      }
    }

    const database = new FileDatabase(DATABASE_PATH);
    await database.load(replicator ? { replicator } : undefined);

    const digest = database.getPromptDigest();
    const history = trimHistory(payload.history);

    const plan: AiPlan =
      payload.plan ??
      (await generatePlan({
        message,
        history,
        databaseDigest: digest,
      }));

    for (const warning of plan.warnings ?? []) {
      warnings.add(warning);
    }

    const shouldRequireConfirmation = Boolean(replicator) && !payload.confirm;

    const execution = await executePlanOperations({
      operations: plan.operations,
      database,
      replicator,
      applyChanges: !shouldRequireConfirmation,
    });

    for (const errorDetail of execution.errors) {
      warnings.add(errorDetail);
    }

    const previewMode = shouldRequireConfirmation && !execution.failed;
    const operationsForResponse = previewMode
      ? decorateForPreview(execution.results)
      : execution.results;

    if (previewMode) {
      warnings.add("No changes have been applied yet; confirm to write them to Neon.");
    }

    const snapshot = database.getSummary();

    const messagePayload: AssistantMessagePayload = {
      role: "assistant",
      content: buildResponseContent(plan, operationsForResponse, previewMode),
      thought: plan.thought?.trim() || undefined,
      operations: operationsForResponse,
      warnings: Array.from(warnings),
      snapshot,
      requiresConfirmation: previewMode ? true : undefined,
      plan: previewMode ? plan : undefined,
    };

    return NextResponse.json({ message: messagePayload });
  } catch (error) {
    console.error("Failed to execute AI plan", error);
    const detail = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

type ExecutePlanOptions = {
  operations: AiOperation[];
  database: FileDatabase;
  replicator?: NeonOperationReplicator;
  applyChanges: boolean;
};

type ExecutionOutcome = {
  results: OperationExecution[];
  errors: string[];
  failed: boolean;
};

async function executePlanOperations({
  operations,
  database,
  replicator,
  applyChanges,
}: ExecutePlanOptions): Promise<ExecutionOutcome> {
  const results: OperationExecution[] = [];
  const errors: string[] = [];
  let failed = false;

  try {
    if (replicator) {
      await replicator.begin();
    }

    for (const operation of operations) {
      try {
        const outcome = await database.executeOperation(operation, { replicator });
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
        errors.push(detail);
        failed = true;
        break;
      }
    }

    if (replicator) {
      if (failed || !applyChanges) {
        await replicator.rollback();
      } else {
        await replicator.commit();
      }
    }
  } catch (error) {
    failed = true;
    if (replicator) {
      try {
        await replicator.rollback();
      } catch (rollbackError) {
        console.error("Failed to rollback Neon transaction", rollbackError);
      }
    }
    throw error;
  } finally {
    if (failed || !applyChanges) {
      await database.load(replicator ? { replicator } : undefined);
    } else {
      await database.save();
    }
  }

  return { results, errors, failed };
}

function buildResponseContent(plan: AiPlan, results: OperationExecution[], preview: boolean) {
  const base = plan.finalResponse?.trim() || buildFallbackResponse(results);
  if (!preview) {
    return base;
  }
  const suffix = "I have not applied these changes yet. Confirm to execute them against Neon.";
  return `${base}${base.endsWith(".") ? "" : "."} ${suffix}`;
}

function decorateForPreview(results: OperationExecution[]): OperationExecution[] {
  return results.map((entry) =>
    entry.status === "success"
      ? {
          ...entry,
          detail: `${entry.detail} (pending confirmation)`,
        }
      : entry,
  );
}

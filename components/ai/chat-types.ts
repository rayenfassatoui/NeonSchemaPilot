import type { AssistantMessagePayload, OperationExecution } from "@/types/ai";

export type SnapshotSummary = AssistantMessagePayload["snapshot"];

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
  thought?: string;
  operations?: OperationExecution[];
  warnings?: string[];
  snapshot?: SnapshotSummary;
};

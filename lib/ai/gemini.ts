import type { Content, GenerativeModel } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

import type { AiPlan, ConversationHistoryEntry } from "@/types/ai";

import { parseAiPlan } from "./plan-schema";
import { getSystemPrompt } from "./prompts";

const MODEL_NAME = "gemini-2.5-flash";
let cachedModel: GenerativeModel | null = null;

function convertHistory(history: ConversationHistoryEntry[] | undefined): Content[] {
  if (!history?.length) return [];

  return history.map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));
}

function getModel(): GenerativeModel {
  if (cachedModel) {
    return cachedModel;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  cachedModel = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: getSystemPrompt(),
  });
  return cachedModel;
}

export type PlanRequestPayload = {
  message: string;
  history?: ConversationHistoryEntry[];
  databaseDigest: string;
};

export async function generatePlan({ message, history, databaseDigest }: PlanRequestPayload): Promise<AiPlan> {
  const model = getModel();
  const baseContents = buildPromptContents({ message, history, databaseDigest });

  try {
    const text = await requestPlanText(model, baseContents);
    return parseAiPlan(text);
  } catch (error) {
    const retryContents = [
      ...baseContents,
      {
        role: "user" as const,
        parts: [
          {
            text: "Your previous response was not valid JSON. Respond again using strictly valid JSON that matches the documented schema.",
          },
        ],
      },
    ];

    try {
      const retryText = await requestPlanText(model, retryContents);
      return parseAiPlan(retryText);
    } catch (secondError) {
      const detail =
        secondError instanceof Error ? secondError.message : "Unknown parse failure from Gemini.";
      throw new Error(`Gemini response could not be parsed after retry: ${detail}`);
    }
  }
}

function buildPromptContents({
  message,
  history,
  databaseDigest,
}: PlanRequestPayload & { history?: ConversationHistoryEntry[] }): Content[] {
  return [
    ...convertHistory(history),
    {
      role: "user" as const,
      parts: [
        {
          text: [
            "Natural language request:",
            message.trim(),
            "",
            "Current database snapshot:",
            databaseDigest.trim() || "<empty>",
            "",
            "Produce JSON only.",
          ].join("\n"),
        },
      ],
    },
  ];
}

async function requestPlanText(model: GenerativeModel, contents: Content[]) {
  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1536,
      responseMimeType: "application/json",
    },
  });

  const response = await result.response;
  const text = response.text();
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import type { AiPlan, ExecuteAiResponse } from "@/types/ai";

import { ChatMessage } from "./chat-message";
import type { AssistantChatMessage, SnapshotSummary } from "./chat-types";

const SUGGESTED_PROMPTS = [
  "Create a projects table with title, owner_email, and status columns.",
  "Insert 3 sample customers and then show me only active ones.",
  "Grant the analyst role read-only access to every table.",
];

const INITIAL_ASSISTANT_MESSAGE: AssistantChatMessage = {
  id: "assistant-intro",
  role: "assistant",
  content:
    "Hi! I'm your schema co-designer. Ask me to craft tables, seed sample rows, explore the data, or fine-tune permissions across this file-backed workspace.",
  createdAt: Date.now(),
};

type PendingConfirmation = {
  plan: AiPlan;
};

export function AssistantShell() {
  const [messages, setMessages] = React.useState<AssistantChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [isConfirming, setConfirming] = React.useState(false);
  const [pendingConfirmation, setPendingConfirmation] = React.useState<PendingConfirmation | null>(null);
  const endOfFeedRef = React.useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectionParam = searchParams.get("connection") ?? undefined;
  const [cachedConnection, setCachedConnection] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.sessionStorage.getItem("mydatabase.connection");
    if (!stored) {
      return;
    }

    setCachedConnection(stored);

    if (!connectionParam) {
      const params = new URLSearchParams(window.location.search);
      params.set("connection", stored);
      const next = params.toString();
      router.replace(next ? `?${next}` : "", { scroll: false });
    }
  }, [connectionParam, router]);

  const effectiveConnection = connectionParam ?? cachedConnection ?? undefined;

  const latestSnapshot = React.useMemo<SnapshotSummary | undefined>(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const entry = messages[index];
      if (entry.role === "assistant" && entry.snapshot) {
        return entry.snapshot;
      }
    }
    return undefined;
  }, [messages]);

  React.useEffect(() => {
    endOfFeedRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestedPrompt = React.useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const appendHistory = React.useCallback(
    (extras: AssistantChatMessage[] = []) => {
      const sequence = [...messages, ...extras];
      return sequence
        .filter((entry) => !entry.pending)
        .map((entry) => ({ role: entry.role, content: entry.content }));
    },
    [messages],
  );

  const handleSubmit = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isSubmitting) {
        return;
      }

      const pendingId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const userMessage: AssistantChatMessage = {
        id: `user-${pendingId}`,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      const placeholder: AssistantChatMessage = {
        id: `assistant-pending-${pendingId}`,
        role: "assistant",
        content: "Let me think through that…",
        createdAt: Date.now(),
        pending: true,
      };

      const conversationHistory = appendHistory([userMessage]);

  setMessages((previous) => [...previous, userMessage, placeholder]);
      setInput("");
      setSubmitting(true);

      try {
        const response = await fetch("/api/ai/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: conversationHistory,
            connectionParam: effectiveConnection,
          }),
        });

        if (!response.ok) {
          let description = response.statusText;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload?.error) {
              description = payload.error;
            }
          } catch {
            // swallow JSON parse errors so we can fall back to statusText
          }
          throw new Error(description);
        }

        const payload = (await response.json()) as ExecuteAiResponse;
        const assistantMessage: AssistantChatMessage = {
          id: `assistant-${pendingId}`,
          role: "assistant",
          content: payload.message.content,
          createdAt: Date.now(),
          pending: false,
          thought: payload.message.thought,
          operations: payload.message.operations,
          warnings: payload.message.warnings,
          snapshot: payload.message.snapshot,
          requiresConfirmation: payload.message.requiresConfirmation,
          plan: payload.message.plan,
        };

        setMessages((previous) =>
          previous.map((entry) => (entry.id === placeholder.id ? assistantMessage : entry))
        );

        if (payload.message.requiresConfirmation && payload.message.plan) {
          setPendingConfirmation({ plan: payload.message.plan });
        } else {
          setPendingConfirmation(null);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        setMessages((previous) =>
          previous.map((entry) =>
            entry.id === placeholder.id
              ? {
                  ...entry,
                  content: `I ran into an issue: ${detail}`,
                  pending: false,
                  warnings: [detail],
                }
              : entry
          )
        );
      } finally {
        setSubmitting(false);
      }
    },
    [appendHistory, effectiveConnection, input, isSubmitting, messages]
  );
  const handleConfirm = React.useCallback(async () => {
    if (!pendingConfirmation || isConfirming) {
      return;
    }

    const confirmationText = "Yes, apply these changes.";
    const userMessage: AssistantChatMessage = {
      id: `user-confirm-${Date.now()}`,
      role: "user",
      content: confirmationText,
      createdAt: Date.now(),
    };

    const placeholder: AssistantChatMessage = {
      id: `assistant-confirm-${Date.now()}`,
      role: "assistant",
      content: "Applying your confirmed changes…",
      createdAt: Date.now(),
      pending: true,
    };

    const conversationHistory = appendHistory([userMessage]);

    setMessages((previous) => [...previous, userMessage, placeholder]);
    setConfirming(true);

    try {
      const response = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: confirmationText,
          history: conversationHistory,
          connectionParam: effectiveConnection,
          confirm: true,
          plan: pendingConfirmation.plan,
        }),
      });

      if (!response.ok) {
        let description = response.statusText;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            description = payload.error;
          }
        } catch {
          // ignore JSON parse failure
        }
        throw new Error(description);
      }

      const payload = (await response.json()) as ExecuteAiResponse;
      const assistantMessage: AssistantChatMessage = {
        id: `assistant-confirmed-${Date.now()}`,
        role: "assistant",
        content: payload.message.content,
        createdAt: Date.now(),
        pending: false,
        thought: payload.message.thought,
        operations: payload.message.operations,
        warnings: payload.message.warnings,
        snapshot: payload.message.snapshot,
        requiresConfirmation: payload.message.requiresConfirmation,
        plan: payload.message.plan,
      };

      setMessages((previous) =>
        previous.map((entry) => (entry.id === placeholder.id ? assistantMessage : entry))
      );
      setPendingConfirmation(null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      setMessages((previous) =>
        previous.map((entry) =>
          entry.id === placeholder.id
            ? {
                ...entry,
                content: `I couldn’t apply the changes: ${detail}`,
                pending: false,
                warnings: [detail],
              }
            : entry
        )
      );
    } finally {
      setConfirming(false);
    }
  }, [appendHistory, effectiveConnection, isConfirming, pendingConfirmation]);

  const handleCancelConfirmation = React.useCallback(() => {
    setPendingConfirmation(null);
    setMessages((previous) => {
      if (!previous.length) return previous;
      const next = [...previous];
      const last = next[next.length - 1];
      if (last.role !== "assistant" || !last.requiresConfirmation) {
        return previous;
      }
      const cancellationNotice = "Plan cancelled; no changes were applied.";
      const warnings = last.warnings ? [...last.warnings, cancellationNotice] : [cancellationNotice];
      next[next.length - 1] = {
        ...last,
        requiresConfirmation: false,
        warnings,
      };
      return next;
    });
  }, []);


  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-background via-background/95 to-background text-foreground">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
            AI orchestration
            <span className="h-1 w-1 rounded-full bg-primary" />
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Sculpt your file-backed database with Gemini
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Speak naturally. I will translate requests into safe DDL, DML, DQL, and DCL plans, then execute
            them against your project snapshot.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <section className="flex h-[70vh] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/80 shadow-lg shadow-primary/10 backdrop-blur">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={endOfFeedRef} className="h-px w-full" />
            </div>
            <Separator />
            {pendingConfirmation ? (
              <ConfirmationPanel
                onConfirm={handleConfirm}
                onCancel={handleCancelConfirmation}
                disabled={isSubmitting || isConfirming}
              />
            ) : null}
            <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what to build or explore…"
                className="min-h-28 resize-none rounded-2xl border-border/70 bg-muted/40 px-5 py-4 text-sm"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="rounded-full border border-border/60 bg-background/70 px-3 py-1 transition hover:border-primary/40 hover:text-primary"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || isConfirming || !input.trim()}
                  className="self-end rounded-full px-6"
                >
                  {isSubmitting ? "Working" : "Send"}
                </Button>
              </div>
            </form>
          </section>
          <aside className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/70 p-6 shadow-inner">
            <SnapshotPanel snapshot={latestSnapshot} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ConfirmationPanel({
  onConfirm,
  onCancel,
  disabled,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-6 py-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">
        Review complete? Confirm to apply these changes to your Neon database.
      </p>
      <p>
        We ran the plan in a safe preview and rolled back automatically. Nothing has been persisted yet.
      </p>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={disabled}>
          Confirm and execute
        </Button>
      </div>
    </div>
  );
}

function SnapshotPanel({ snapshot }: { snapshot?: SnapshotSummary }) {
  if (!snapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Awaiting your first change</p>
        <p>
          Once the assistant executes a plan, you&apos;ll see a living overview of tables, rows, and role permissions right here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <section className="rounded-2xl border border-border/60 bg-muted/40 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Project health</p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          Revision {snapshot.meta.revision}
        </p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(snapshot.meta.updatedAt).toLocaleString()}
        </p>
      </section>
      <section className="space-y-3">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tables</p>
          <p className="text-sm font-medium text-muted-foreground">{snapshot.tables.length} total</p>
        </header>
        <div className="space-y-3">
          {snapshot.tables.length ? (
            snapshot.tables.slice(0, 4).map((table) => (
              <div
                key={table.name}
                className="rounded-2xl border border-border/60 bg-background/80 px-4 py-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{table.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {table.columnCount} column{table.columnCount === 1 ? "" : "s"} · {table.rowCount} row{table.rowCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {table.primaryKey ? `PK ${table.primaryKey}` : "No PK"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {table.columns.slice(0, 6).map((column: (typeof table.columns)[number]) => (
                    <span
                      key={column.name}
                      className="rounded-full border border-border/50 bg-muted/50 px-2 py-1"
                    >
                      {column.name}: {column.dataType}
                    </span>
                  ))}
                  {table.columns.length > 6 ? (
                    <span className="rounded-full border border-border/40 bg-muted/40 px-2 py-1">
                      +{table.columns.length - 6} more
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No tables yet. Ask the assistant to create one to get started.
            </div>
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-border/60 bg-muted/40 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Roles</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {snapshot.roles.map((role) => (
            <li key={role.name} className="flex items-center justify-between">
              <span className="font-medium text-foreground">{role.name}</span>
              <span className="text-xs text-muted-foreground">
                {role.description ?? "No description"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

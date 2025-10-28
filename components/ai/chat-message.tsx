"use client";


import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { AssistantChatMessage } from "./chat-types";

type ChatMessageProps = {
  message: AssistantChatMessage;
};

const STATUS_STYLES: Record<"success" | "skipped" | "error", string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  skipped: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  error: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

type OperationResultSet = NonNullable<
  NonNullable<AssistantChatMessage["operations"]>[number]["resultSet"]
>;

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const bubbleClassName = cn(
    "relative max-w-[540px] rounded-3xl px-5 py-4 text-sm shadow-sm transition",
    isUser
      ? "ml-auto bg-primary text-primary-foreground shadow-primary/10"
      : "bg-background/90 text-foreground backdrop-blur border border-border/60"
  );

  const avatarLabel = isUser ? "You" : "AI";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
         data-pending={message.pending ? "true" : undefined}>
      <div
        className={cn(
          "mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide",
          isUser ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {avatarLabel}
      </div>
      <div className={bubbleClassName}>
        <ArticleContent message={message} isUser={isUser} />
      </div>
    </div>
  );
}

function ArticleContent({ message, isUser }: { message: AssistantChatMessage; isUser: boolean }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>;
  }

  const hasOperations = Boolean(message.operations?.length);
  const hasWarnings = Boolean(message.warnings?.length);
  const awaitingConfirmation = message.requiresConfirmation;

  return (
    <div className="space-y-4">
      <p className={cn("whitespace-pre-wrap leading-relaxed", message.pending && "animate-pulse")}>{message.content}</p>
      {message.thought ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-muted-foreground/80">Plan: </span>
          {message.thought}
        </div>
      ) : null}
      {hasOperations ? <OperationList operations={message.operations!} /> : null}
      {hasWarnings ? <WarningList warnings={message.warnings!} /> : null}
      {awaitingConfirmation ? (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
          Awaiting your confirmation before committing to Neon.
        </div>
      ) : null}
    </div>
  );
}

function OperationList({ operations }: { operations: Required<AssistantChatMessage>["operations"] }) {
  return (
    <section className="space-y-3 rounded-3xl border border-border/60 bg-background/60 p-4">
      <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>Operations executed</span>
        <span>{operations.length} item{operations.length === 1 ? "" : "s"}</span>
      </header>
      <Separator className="bg-border/60" />
      <ul className="space-y-2 text-sm">
        {operations.map((operation) => (
          <li
            key={operation.id}
            className="rounded-2xl border border-border/40 bg-muted/40 px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
              <span className="uppercase tracking-wide text-muted-foreground">{operation.category}</span>
              <Badge className={cn("rounded-full px-2 py-0.5", STATUS_STYLES[operation.status])}>
                {operation.status}
              </Badge>
            </div>
            <p className="mt-2 text-muted-foreground">{operation.detail}</p>
            {operation.resultSet ? <ResultPreview result={operation.resultSet} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-3xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="font-semibold uppercase tracking-wide">Heads-up</p>
      <ul className="mt-2 space-y-1">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`} className="leading-relaxed">
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function ResultPreview({ result }: { result: OperationResultSet }) {
  return (
    <div className="mt-3 rounded-2xl border border-border/40 bg-background/70 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Result preview</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              {result.columns.map((column) => (
                <th key={column} className="border-b border-border/40 px-2 py-1 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length ? (
              result.rows.map((row, index) => (
                <tr key={index} className="text-muted-foreground/90">
                  {result.columns.map((column) => (
                    <td key={column} className="border-b border-border/30 px-2 py-1 align-top">
                      {formatValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={result.columns.length} className="px-2 py-2 text-muted-foreground">
                  No rows matched the query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Returned {result.rows.length} of {result.rowCount} row(s).
      </p>
    </div>
  );
}

import { Database, Layers, ScrollText } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Highlight = {
  title: string;
  description: string;
  meta: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const highlights: Highlight[] = [
  {
    title: "Visual Explorer",
    description:
      "Lay out tables on an infinite canvas, trace foreign keys instantly, and annotate ideas before they become tickets.",
    meta: "Canvas view",
    icon: Layers,
  },
  {
    title: "Table Data Explorer",
    description:
      "Surface column metadata and sample rows from Neon so stakeholders can validate assumptions without running queries.",
    meta: "Tabular view",
    icon: Database,
  },
  {
    title: "SQL Workspace",
    description:
      "Review the generated SQL diff, copy it into your pipeline, or hand it back to the assistant for another iteration.",
    meta: "SQL-first view",
    icon: ScrollText,
  },
];

export function HomeWorkspaceHighlights() {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-muted/20 p-10 shadow-inner shadow-primary/5 backdrop-blur-sm" id="workspace">
      <div className="flex flex-col gap-3 text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Workspaces that scale with you</span>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">One schema, three perspectives</h2>
        <p className="mx-auto max-w-3xl text-base text-muted-foreground">
          Whether you think in diagrams, rows, or raw SQL, MyDatabase Studio keeps every perspective synchronized. Switch contexts without losing the thread of the conversation.
        </p>
      </div>
      <Separator className="my-10 border-border/40" />
      <div className="grid gap-6 lg:grid-cols-3">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <Card
              key={highlight.title}
              className="h-full rounded-2xl border border-border/60 bg-background/70 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {highlight.meta}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{highlight.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{highlight.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

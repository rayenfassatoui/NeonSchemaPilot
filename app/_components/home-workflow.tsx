import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const steps = [
  {
    title: "Connect & explore",
    description:
      "Paste your Neon connection string to instantly access your schema. Browse tables visually, inspect columns, and query data—all without leaving your browser.",
    detail: "Secure connection handling with automatic schema detection and real-time sync.",
  },
  {
    title: "Build & optimize",
    description:
      "Use the AI assistant to draft queries, create backups, and schedule maintenance tasks. Monitor performance metrics and get smart optimization recommendations.",
    detail: "AI-powered insights help you write better queries and maintain database health.",
  },
  {
    title: "Automate & collaborate",
    description:
      "Set up scheduled queries for reports, configure automated backups, and share workspace snapshots with your team. Everything stays synced across all views.",
    detail: "Built-in automation tools reduce manual work and keep your database running smoothly.",
  },
] as const;

export function HomeWorkflow() {
  return (
    <section className="grid gap-12 lg:gap-16 lg:grid-cols-[0.8fr_1fr]" id="workflow">
      <div className="space-y-6">
        <Badge variant="outline" className="border-border/60 bg-background/70 uppercase tracking-[0.3em] text-muted-foreground">
          How it works
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          From connection to production in three simple steps
        </h2>
        <p className="text-base text-muted-foreground">
          MyDatabase Studio streamlines your entire database workflow. Connect once, then explore, optimize, and automate everything from a single intuitive interface.
        </p>
      </div>
      <ol className="space-y-6">
        {steps.map((step, index) => (
          <Card key={step.title} className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-6 shadow-sm transition-shadow hover:shadow-md">
            <span className="absolute -top-4 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">{step.detail}</p>
            </div>
          </Card>
        ))}
      </ol>
    </section>
  );
}

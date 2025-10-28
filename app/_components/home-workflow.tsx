import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const steps = [
  {
    title: "Connect securely",
    description:
      "Paste a Neon connection string and we immediately validate it. No credentials are persisted—only a read-only snapshot leaves the server.",
    detail: "Neon describe APIs power the schema and table samples we expose.",
  },
  {
    title: "Capture the full story",
    description:
      "We compile the schema, seed data, and AI intent into a structured plan. Visual and tabular explorers stay in sync with the SQL preview.",
    detail: "The file-backed datastore keeps change proposals versioned and reviewable.",
  },
  {
    title: "Share and iterate",
    description:
      "Send a single link to collaborators. They can inspect relations, ask the assistant for tweaks, or export ready-to-run SQL when the plan is approved.",
    detail: "Role-aware controls make it easy to decide who can execute changes versus leave feedback.",
  },
] as const;

export function HomeWorkflow() {
  return (
    <section className="grid gap-10 lg:grid-cols-[0.8fr_1fr]" id="workflow">
      <div className="space-y-4">
        <Badge variant="outline" className="border-border/60 bg-background/70 uppercase tracking-[0.3em] text-muted-foreground">
          How it works
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          From connection string to actionable plan in minutes
        </h2>
        <p className="text-base text-muted-foreground">
          MyDatabase Studio keeps technical and non-technical teammates aligned. We pair explainable AI output with the raw SQL so you can move from idea to deployment with confidence.
        </p>
      </div>
      <ol className="space-y-6">
        {steps.map((step, index) => (
          <Card key={step.title} className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-6 shadow-sm">
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

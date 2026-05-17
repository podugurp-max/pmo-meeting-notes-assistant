import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  ShieldAlert,
  HelpCircle,
  Mail,
  Eraser,
  Briefcase,
} from "lucide-react";
import { parseNotes, type PMOSummary } from "@/lib/parseNotes";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PMO Meeting Notes Assistant — Structured Project Follow-Ups" },
      {
        name: "description",
        content:
          "Turn messy meeting notes into clear executive summaries, action items, risks, and follow-up emails for project teams.",
      },
    ],
  }),
});

const SAMPLE = `Project sync — Q3 launch
Attendees: Sarah, Marcus, Priya, Daniel

- Sarah confirmed the marketing site copy is approved by legal.
- We decided to move the launch date to October 15 instead of October 1.
- Marcus will prepare the updated launch timeline by Friday.
- Priya to coordinate with the design team on the hero image, due Sept 20.
- Risk: the analytics integration is behind schedule and may block reporting at launch.
- Daniel needs to confirm the budget for paid ads — unclear if Q3 funds are still available.
- Open question: who will own customer support coverage on launch day?
- Agreed to run a final go/no-go review on October 10.`;

function Index() {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<PMOSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!notes.trim()) {
      toast.error("Please paste some meeting notes first.");
      return;
    }
    setLoading(true);
    // Small delay for perceived processing
    setTimeout(() => {
      setResult(parseNotes(notes));
      setLoading(false);
      toast.success("PMO summary generated.");
    }, 400);
  };

  const formatPlainText = (r: PMOSummary) => {
    const ai = r.actionItems.length
      ? r.actionItems
          .map(
            (a, i) =>
              `${i + 1}. ${a.task}\n   Owner: ${a.owner} — Deadline: ${a.deadline}`
          )
          .join("\n")
      : "None recorded.";
    return `EXECUTIVE SUMMARY
${r.executiveSummary}

DECISIONS MADE
${r.decisions.length ? r.decisions.map((d) => `• ${d}`).join("\n") : "None recorded."}

ACTION ITEMS
${ai}

RISKS / ISSUES
${r.risks.length ? r.risks.map((d) => `• ${d}`).join("\n") : "None recorded."}

OPEN QUESTIONS
${r.openQuestions.length ? r.openQuestions.map((d) => `• ${d}`).join("\n") : "None recorded."}

SUGGESTED FOLLOW-UP EMAIL
${r.followUpEmail}`;
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                PMO Meeting Notes Assistant
              </h1>
              <p className="text-xs text-muted-foreground">
                Structured project follow-ups in seconds
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Demo · Rule-based parser
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Intro */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Turn messy meeting notes into clear PMO deliverables
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Paste raw notes from a project meeting and generate an executive
            summary, decisions, action items with owners and deadlines, risks,
            open questions, and a ready-to-send follow-up email.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Meeting notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Do not paste confidential or sensitive company information.
                </AlertDescription>
              </Alert>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your raw meeting notes here. Bullet points, rough sentences, and mixed formats all work."
                className="min-h-[360px] resize-y font-mono text-sm leading-relaxed"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {loading ? "Generating…" : "Generate PMO Summary"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNotes(SAMPLE)}
                  type="button"
                >
                  Load sample
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNotes("");
                    setResult(null);
                  }}
                  type="button"
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Output */}
          <div className="lg:col-span-3">
            {!result ? (
              <Card className="flex h-full min-h-[400px] items-center justify-center border-dashed">
                <div className="px-8 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">
                    Your structured summary will appear here
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste notes on the left and click Generate.
                  </p>
                </div>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">PMO Summary</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generated from your notes · Review before sharing
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(formatPlainText(result), "all")}
                  >
                    {copied === "all" ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy all
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Section
                    icon={<FileText className="h-4 w-4" />}
                    title="Executive Summary"
                  >
                    <p className="text-sm leading-relaxed text-foreground">
                      {result.executiveSummary}
                    </p>
                  </Section>

                  <Separator />

                  <Section
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    title="Decisions Made"
                    count={result.decisions.length}
                  >
                    <BulletList items={result.decisions} />
                  </Section>

                  <Separator />

                  <Section
                    icon={<ListTodo className="h-4 w-4 text-primary" />}
                    title="Action Items"
                    count={result.actionItems.length}
                  >
                    {result.actionItems.length === 0 ? (
                      <EmptyLine />
                    ) : (
                      <div className="overflow-hidden rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Task</th>
                              <th className="px-3 py-2 text-left font-medium">Owner</th>
                              <th className="px-3 py-2 text-left font-medium">Deadline</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.actionItems.map((a, i) => (
                              <tr key={i} className="border-t border-border align-top">
                                <td className="px-3 py-2">{a.task}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={
                                      a.owner === "Not specified"
                                        ? "text-muted-foreground italic"
                                        : "font-medium text-foreground"
                                    }
                                  >
                                    {a.owner}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={
                                      a.deadline === "Not specified"
                                        ? "text-muted-foreground italic"
                                        : "font-medium text-foreground"
                                    }
                                  >
                                    {a.deadline}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Section>

                  <Separator />

                  <Section
                    icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
                    title="Risks / Issues"
                    count={result.risks.length}
                  >
                    <BulletList items={result.risks} />
                  </Section>

                  <Separator />

                  <Section
                    icon={<HelpCircle className="h-4 w-4 text-amber-600" />}
                    title="Open Questions"
                    count={result.openQuestions.length}
                  >
                    <BulletList items={result.openQuestions} />
                  </Section>

                  <Separator />

                  <Section
                    icon={<Mail className="h-4 w-4 text-primary" />}
                    title="Suggested Follow-Up Email"
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.followUpEmail, "email")}
                      >
                        {copied === "email" ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy email
                      </Button>
                    }
                  >
                    <pre className="whitespace-pre-wrap rounded-md border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed text-foreground">
                      {result.followUpEmail}
                    </pre>
                  </Section>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-6 text-xs text-muted-foreground">
          PMO Meeting Notes Assistant · Outputs are organized from your notes
          only. Always review before sharing.
        </div>
      </footer>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {typeof count === "number" && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {count}
            </Badge>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <EmptyLine />;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-foreground">
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyLine() {
  return (
    <p className="text-sm italic text-muted-foreground">None recorded.</p>
  );
}

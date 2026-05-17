export interface PMOSummary {
  executiveSummary: string;
  decisions: string[];
  actionItems: { task: string; owner: string; deadline: string }[];
  risks: string[];
  openQuestions: string[];
  followUpEmail: string;
}

const NOT_SPECIFIED = "Not specified";

const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-\*•·●▪◦\d\.\)]+/, "").trim())
    .filter((l) => l.length > 0);

const splitSentences = (text: string) =>
  text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

// Match dates like "by Friday", "by 12/05", "on Oct 5", "next Monday", "EOD", "by end of week"
const DATE_PATTERNS = [
  /\b(by|before|on|due|deadline[: ]+|due date[: ]+)\s+([A-Z][a-z]+\s+\d{1,2}(?:,\s*\d{4})?)/i,
  /\b(by|before|on|due)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
  /\b(by|before|on|due)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /\b(by|before)\s+(next\s+(?:week|monday|tuesday|wednesday|thursday|friday|month|quarter))/i,
  /\b(by|before)\s+(end of (?:day|week|month|quarter|sprint)|EOD|EOW|EOM|COB)/i,
  /\b(this|next)\s+(week|month|quarter|sprint)\b/i,
  /\bQ[1-4]\s*\d{0,4}\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
];

function extractDeadline(line: string): string {
  for (const re of DATE_PATTERNS) {
    const m = line.match(re);
    if (m) return m[0].replace(/^by\s+|^before\s+|^on\s+|^due\s+/i, "").trim();
  }
  return NOT_SPECIFIED;
}

// Owner: look for "@name", "Name will/to", "assigned to Name", "Owner: Name"
function extractOwner(line: string): string {
  const at = line.match(/@([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (at) return at[1];
  const assigned = line.match(/\b(?:assigned to|owner[: ]+|responsible[: ]+)\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
  if (assigned) return assigned[1];
  const willDo = line.match(/\b([A-Z][a-zA-Z]+)\s+(?:will|to|should|is going to|needs to|must)\s+/);
  if (willDo) return willDo[1];
  const dashOwner = line.match(/\(([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\)/);
  if (dashOwner) return dashOwner[1];
  return NOT_SPECIFIED;
}

const ACTION_KEYWORDS = /\b(will|to do|todo|action|follow up|follow-up|send|share|prepare|draft|review|complete|finish|create|update|schedule|set up|organize|deliver|submit|provide|investigate|confirm|reach out|contact|email|book|coordinate|assign|finalize|build|test|deploy|write|document)\b/i;
const DECISION_KEYWORDS = /\b(decided|decision|agreed|approved|confirmed|will go with|chose|selected|signed off|finaliz(?:e|ed)|concluded|resolved that)\b/i;
const RISK_KEYWORDS = /\b(risk|issue|blocker|concern|problem|delay|delayed|behind schedule|at risk|jeopardy|conflict|escalat|dependency|bottleneck|over budget|short(?:age|fall))\b/i;
const QUESTION_KEYWORDS = /\b(unclear|tbd|to be determined|to be decided|need(?:s)? to clarify|pending|awaiting|unknown|not sure|question|open item|figure out|determine)\b/i;

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = x.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function parseNotes(raw: string): PMOSummary {
  const text = raw.trim();
  if (!text) {
    return {
      executiveSummary: "No notes provided.",
      decisions: [],
      actionItems: [],
      risks: [],
      openQuestions: [],
      followUpEmail: "",
    };
  }

  const lines = splitLines(text);
  const sentences = splitSentences(text);

  const decisions: string[] = [];
  const risks: string[] = [];
  const openQuestions: string[] = [];
  const actionLines: string[] = [];

  for (const line of lines) {
    const isQuestion = line.endsWith("?") || QUESTION_KEYWORDS.test(line);
    const isDecision = DECISION_KEYWORDS.test(line);
    const isRisk = RISK_KEYWORDS.test(line);
    const isAction = ACTION_KEYWORDS.test(line);

    if (isQuestion) openQuestions.push(line);
    if (isDecision) decisions.push(line);
    if (isRisk) risks.push(line);
    if (isAction && !isDecision && !isRisk && !isQuestion) actionLines.push(line);
  }

  // Also check sentences for additional decisions/risks not on their own line
  for (const s of sentences) {
    if (DECISION_KEYWORDS.test(s) && !decisions.some((d) => d.includes(s))) decisions.push(s);
    if (RISK_KEYWORDS.test(s) && !risks.some((d) => d.includes(s))) risks.push(s);
  }

  const actionItems = dedupe(actionLines).map((line) => ({
    task: line,
    owner: extractOwner(line),
    deadline: extractDeadline(line),
  }));

  // Executive summary: first 1-3 sentences that aren't action/decision/risk specific, fallback to first sentences
  const summaryCandidates = sentences.filter(
    (s) => !ACTION_KEYWORDS.test(s) && !DECISION_KEYWORDS.test(s) && !RISK_KEYWORDS.test(s) && !s.endsWith("?")
  );
  const summarySource = (summaryCandidates.length ? summaryCandidates : sentences).slice(0, 3).join(" ");
  const stats = `The meeting covered ${decisions.length} decision${decisions.length === 1 ? "" : "s"}, ${actionItems.length} action item${actionItems.length === 1 ? "" : "s"}, ${risks.length} risk${risks.length === 1 ? "" : "s"}/issue${risks.length === 1 ? "" : "s"}, and ${openQuestions.length} open question${openQuestions.length === 1 ? "" : "s"}.`;
  const executiveSummary = summarySource ? `${summarySource} ${stats}` : stats;

  // Follow-up email
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const actionLinesEmail = actionItems.length
    ? actionItems
        .map((a, i) => `  ${i + 1}. ${a.task}\n     Owner: ${a.owner} — Deadline: ${a.deadline}`)
        .join("\n")
    : "  None recorded.";
  const decisionLinesEmail = decisions.length ? decisions.map((d) => `  • ${d}`).join("\n") : "  None recorded.";
  const riskLinesEmail = risks.length ? risks.map((r) => `  • ${r}`).join("\n") : "  None recorded.";
  const questionLinesEmail = openQuestions.length ? openQuestions.map((q) => `  • ${q}`).join("\n") : "  None recorded.";

  const followUpEmail = `Subject: Meeting Recap & Next Steps — ${today}

Hi team,

Thank you for joining today's meeting. Below is a brief recap and the agreed next steps.

Summary
${executiveSummary}

Decisions
${decisionLinesEmail}

Action Items
${actionLinesEmail}

Risks / Issues
${riskLinesEmail}

Open Questions
${questionLinesEmail}

Please reply if anything is missing or needs to be corrected.

Best regards,
[Your name]`;

  return {
    executiveSummary,
    decisions: dedupe(decisions),
    actionItems,
    risks: dedupe(risks),
    openQuestions: dedupe(openQuestions),
    followUpEmail,
  };
}

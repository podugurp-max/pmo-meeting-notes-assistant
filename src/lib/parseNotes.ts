export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

export interface PMOSummary {
  executiveSummary: string;
  decisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  openQuestions: string[];
  followUpEmail: string;
}

const NOT_SPECIFIED = "Not specified";
const NONE = "None identified.";

// --- Tokenization ---------------------------------------------------------

// Split into "units" (sentences or bullet lines). Bullet lines are kept intact;
// paragraph text is split into sentences. This is the core fix: classification
// happens per-unit, never on the whole paragraph.
function tokenize(raw: string): string[] {
  const units: string[] = [];
  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const bulletMatch = line.match(/^([\-\*•·●▪◦]|\d+[\.\)])\s+(.*)$/);
    const stripped = bulletMatch ? bulletMatch[2].trim() : line;

    if (bulletMatch) {
      if (stripped) units.push(stripped);
    } else {
      // paragraph — split into sentences
      const sentences = stripped
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
        .map((s) => s.trim())
        .filter(Boolean);
      units.push(...sentences);
    }
  }
  // Deduplicate while preserving order
  const seen = new Set<string>();
  return units.filter((u) => {
    const k = u.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// --- Extraction helpers ---------------------------------------------------

const MONTHS =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const WEEKDAYS = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?";

// Deadline phrase extraction. Returns the human-readable deadline (e.g. "May 17").
function extractDeadline(unit: string): string {
  const patterns: RegExp[] = [
    new RegExp(`\\bby\\s+(${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?)`, "i"),
    new RegExp(`\\b(?:on|before|due|deadline[: ]+)\\s+(${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?)`, "i"),
    new RegExp(`\\b(${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?)`, "i"),
    /\bby\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
    /\b(\d{4}-\d{2}-\d{2})\b/,
    new RegExp(`\\bby\\s+(next\\s+${WEEKDAYS}|${WEEKDAYS})`, "i"),
    /\bby\s+(end of (?:day|week|month|quarter|sprint)|EOD|EOW|EOM|COB)\b/i,
    /\b(this|next)\s+(week|month|quarter|sprint)\b/i,
    /\b(Q[1-4](?:\s*\d{2,4})?)\b/,
  ];
  for (const re of patterns) {
    const m = unit.match(re);
    if (m) return (m[1] || m[0]).trim();
  }
  return NOT_SPECIFIED;
}

const NAME_RE = /\b([A-Z][a-z]{1,15})(?:\s+([A-Z][a-z]{1,15}))?\b/;

const ROLE_WORDS = new Set([
  "Team",
  "The",
  "Risk",
  "Decision",
  "Action",
  "Open",
  "Owner",
  "Subject",
  "Meeting",
  "IT",
]);

function extractOwner(unit: string): string {
  // "Priya will ...", "Jordan needs to ...", "Marcus to ..."
  const verbAfterName = unit.match(
    /\b([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?)\s+(?:will|to|should|needs to|is going to|must|plans to|agreed to)\b/
  );
  if (verbAfterName && !ROLE_WORDS.has(verbAfterName[1].split(" ")[0])) {
    return verbAfterName[1];
  }
  // "@Name"
  const at = unit.match(/@([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (at) return at[1];
  // "Owner: Name" / "assigned to Name"
  const explicit = unit.match(
    /\b(?:assigned to|owner[: ]+|responsible[: ]+)\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i
  );
  if (explicit) return explicit[1];
  return NOT_SPECIFIED;
}

// Build the "task" text for an action item: the verb phrase after the owner,
// minus the deadline clause, cleaned up.
function extractTask(unit: string, owner: string, deadline: string): string {
  let task = unit;

  // Remove "Owner will/to/needs to" prefix
  if (owner !== NOT_SPECIFIED) {
    const prefix = new RegExp(
      `^${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(?:will|to|should|needs to|is going to|must|plans to|agreed to)\\s+`,
      "i"
    );
    task = task.replace(prefix, "");
  }

  // Remove leading "Action:" / "TODO:" labels
  task = task.replace(/^(action(?: item)?|todo|to do|next step)s?[: ]+/i, "");

  // Trim trailing punctuation
  task = task.replace(/\s+/g, " ").trim();
  task = task.replace(/[.,;]+$/, "");

  // Capitalize first letter
  if (task.length > 0) task = task[0].toUpperCase() + task.slice(1);

  // Append period
  if (task && !/[.!?]$/.test(task)) task += ".";

  return task;
}

// Strip a leading "Decided to" / "Agreed to" / "Risk:" etc. for cleaner bullets
function cleanDecision(unit: string): string {
  let s = unit
    .replace(/^(?:the team |the group |we |they )?(?:decided|agreed|approved|confirmed|signed off|concluded|resolved)\s+(?:to|that|on)?\s+/i, "")
    .replace(/^decision[: ]+/i, "")
    .trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

function cleanRisk(unit: string): string {
  let s = unit
    .replace(/^(?:risk|issue|blocker|concern)[: ]+/i, "")
    .replace(/^(?:there is a |there's a )?(?:risk|issue|concern)\s+(?:that|of|with)\s+/i, "")
    .trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

function cleanQuestion(unit: string): string {
  let s = unit.replace(/^(?:open question|question|tbd|unclear)[: ]+/i, "").trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

// --- Classification -------------------------------------------------------

// Order matters: action > decision > risk > question > narrative.
type Category = "action" | "decision" | "risk" | "question" | "narrative";

const ACTION_VERB =
  /\b(will|to do|todo|action item|action:|follow up|follow-up|send|share|prepare|draft|review|complete|finish|create|update|schedule|set up|organize|deliver|submit|provide|investigate|confirm|reach out|contact|email|book|coordinate|assign|finaliz(?:e|ed)|build|test|deploy|write|document|check|coordinate|sync)\b/i;
const ACTION_OWNER =
  /\b[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?\s+(?:will|to|should|needs to|is going to|must|plans to|agreed to)\b/;
const DECISION_RE =
  /\b(decided|decision[: ]|agreed|approved|confirmed|signed off|chose|selected|concluded|resolved that|will go with|finaliz(?:e|ed) (?:on|to)|keep the first version|will keep)\b/i;
const RISK_RE =
  /\b(risk[: ]|issue[: ]|blocker|concern|problem|delay|delayed|behind schedule|at risk|jeopardy|escalat|bottleneck|over budget|may not (?:be ready|happen|work)|might not|could (?:slip|delay|block))\b/i;
const QUESTION_RE =
  /\?\s*$|\b(open question|tbd|to be determined|to be decided|unclear who|unclear whether|unclear if|need to clarify|needs clarification|pending decision|awaiting|unknown owner)\b/i;

function classify(unit: string): Category {
  // Decision takes priority over action when both match (e.g. "Team decided X" not an action).
  if (DECISION_RE.test(unit)) return "decision";
  // Action: needs an owner-pattern OR an explicit action label/verb at start
  if (ACTION_OWNER.test(unit)) return "action";
  if (/^(action(?: item)?|todo|to do|next step)s?[: ]/i.test(unit)) return "action";
  if (RISK_RE.test(unit)) return "risk";
  if (QUESTION_RE.test(unit)) return "question";
  return "narrative";
}

// --- Main parser ----------------------------------------------------------

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

  const units = tokenize(text);

  const decisions: string[] = [];
  const risks: string[] = [];
  const openQuestions: string[] = [];
  const actionItems: ActionItem[] = [];
  const narrative: string[] = [];

  for (const unit of units) {
    const cat = classify(unit);
    switch (cat) {
      case "action": {
        const owner = extractOwner(unit);
        const deadline = extractDeadline(unit);
        const task = extractTask(unit, owner, deadline);
        if (task) actionItems.push({ task, owner, deadline });
        break;
      }
      case "decision": {
        const cleaned = cleanDecision(unit);
        if (cleaned) decisions.push(cleaned);
        break;
      }
      case "risk": {
        const cleaned = cleanRisk(unit);
        if (cleaned) risks.push(cleaned);
        break;
      }
      case "question": {
        const cleaned = cleanQuestion(unit);
        if (cleaned) openQuestions.push(cleaned);
        break;
      }
      default:
        narrative.push(unit);
    }
  }

  // Executive summary: prefer the first narrative sentence (often the meeting
  // context), then add a one-line tally. Never repeat the entire input.
  const contextSentence = narrative[0] || "";
  const decisionSentence =
    decisions.length === 1
      ? `The group decided to ${decisions[0].replace(/\.$/, "").toLowerCase()}.`
      : decisions.length > 1
      ? `${decisions.length} decisions were recorded.`
      : "";
  const tallyParts: string[] = [];
  if (actionItems.length)
    tallyParts.push(
      `${actionItems.length} follow-up action${actionItems.length === 1 ? "" : "s"} ${actionItems.length === 1 ? "was" : "were"} identified`
    );
  if (risks.length)
    tallyParts.push(
      `${risks.length} risk${risks.length === 1 ? "" : "s"} ${risks.length === 1 ? "was" : "were"} raised`
    );
  const tally = tallyParts.length ? tallyParts.join(", ") + "." : "";

  const executiveSummary =
    [contextSentence, decisionSentence, tally].filter(Boolean).join(" ").trim() ||
    "Summary unavailable — no narrative context detected in the notes.";

  // Build the suggested follow-up email — using only extracted information.
  const followUpEmail = buildEmail({
    contextSentence,
    decisions,
    actionItems,
    risks,
    openQuestions,
  });

  return {
    executiveSummary,
    decisions,
    actionItems,
    risks,
    openQuestions,
    followUpEmail,
  };
}

function buildEmail(args: {
  contextSentence: string;
  decisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  openQuestions: string[];
}): string {
  const { contextSentence, decisions, actionItems, risks, openQuestions } = args;

  const decisionBlock = decisions.length
    ? decisions.map((d) => `  • ${d}`).join("\n")
    : `  ${NONE}`;

  const actionBlock = actionItems.length
    ? actionItems
        .map((a) => {
          const owner = a.owner !== NOT_SPECIFIED ? a.owner : "Owner TBD";
          const deadline =
            a.deadline !== NOT_SPECIFIED ? ` (due ${a.deadline})` : "";
          return `  • ${owner}: ${a.task}${deadline ? deadline : ""}`;
        })
        .join("\n")
    : `  ${NONE}`;

  const riskBlock = risks.length
    ? risks.map((r) => `  • ${r}`).join("\n")
    : `  ${NONE}`;

  const questionBlock = openQuestions.length
    ? openQuestions.map((q) => `  • ${q}`).join("\n")
    : `  ${NONE}`;

  const intro = contextSentence
    ? contextSentence
    : "Here is a brief recap of the meeting.";

  return `Subject: Meeting Recap & Next Steps

Hi team,

${intro}

Decisions
${decisionBlock}

Action Items
${actionBlock}

Risks / Issues
${riskBlock}

Open Questions
${questionBlock}

Please reply if anything is missing or needs to be corrected.

Best regards,`;
}

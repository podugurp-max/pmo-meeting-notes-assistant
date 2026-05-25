import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

export interface PMOSummary {
  executiveSummary: string;
  decisionsMade: string[];
  actionItems: ActionItem[];
  risksIssues: string[];
  openQuestions: string[];
  suggestedFollowUpEmail: string;
}

const SYSTEM_PROMPT = `You are a careful PMO assistant that transforms messy meeting notes into clear project management outputs. Your job is to organize information, not invent it. Preserve all specific names, dates, numbers, decisions, and deadlines exactly as provided. If an owner, deadline, or decision is unclear, label it as "Not specified" or place it under "Open Questions." Use a professional, concise tone. Return the output in the following sections: Executive Summary, Decisions Made, Action Items, Owners and Deadlines, Risks / Issues, Open Questions, and Suggested Follow-Up Email. Do not include information that is not supported by the meeting notes.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    executiveSummary: { type: "string" },
    decisionsMade: { type: "array", items: { type: "string" } },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          owner: { type: "string" },
          deadline: { type: "string" },
        },
        required: ["task", "owner", "deadline"],
      },
    },
    risksIssues: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
    suggestedFollowUpEmail: { type: "string" },
  },
  required: [
    "executiveSummary",
    "decisionsMade",
    "actionItems",
    "risksIssues",
    "openQuestions",
    "suggestedFollowUpEmail",
  ],
};

export const summarizeNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { notes: string }) =>
    z.object({ notes: z.string().min(1).max(50000) }).parse(data)
  )
  .handler(async ({ data }): Promise<PMOSummary> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: "user", parts: [{ text: data.notes }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Gemini API error", response.status, body);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API returned no content");
    }

    let parsed: PMOSummary;
    try {
      parsed = JSON.parse(text) as PMOSummary;
    } catch {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    // Normalize defaults
    return {
      executiveSummary: parsed.executiveSummary ?? "",
      decisionsMade: parsed.decisionsMade ?? [],
      actionItems: (parsed.actionItems ?? []).map((a) => ({
        task: a.task ?? "",
        owner: a.owner || "Not specified",
        deadline: a.deadline || "Not specified",
      })),
      risksIssues: parsed.risksIssues ?? [],
      openQuestions: parsed.openQuestions ?? [],
      suggestedFollowUpEmail: parsed.suggestedFollowUpEmail ?? "",
    };
  });

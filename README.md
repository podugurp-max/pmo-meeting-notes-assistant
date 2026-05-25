# PMO Meeting Notes Assistant

## Live Demo
https://pmo-meeting-notes-assistant.lovable.app

## Overview
PMO Meeting Notes Assistant is a web-based tool that turns rough meeting notes into structured project follow-up materials. It is designed for interns, project coordinators, PMO analysts, student teams, and anyone who needs to convert meeting discussions into clear next steps.

The final version uses a real Gemini model call instead of the rule-based parser used in the draft. The user’s meeting notes are sent to the model with a PMO-focused system prompt and a structured output schema.

## Problem
Meeting notes often contain useful information, but decisions, risks, owners, deadlines, and follow-up questions can be mixed together. This creates extra manual work after meetings and can lead to missed action items or unclear responsibilities.

This tool helps reduce that friction by organizing raw notes into a consistent PMO-style format.

## Intended Users
- PMO interns
- Project coordinators
- Process analysts
- Student project teams
- Team leads who need quick follow-up summaries

## How to Use
1. Paste rough meeting notes into the input box.
2. Click **Generate PMO Summary**.
3. Review the structured output.
4. Copy the results into a meeting recap, task tracker, or follow-up email.
5. Manually verify unclear details before sharing with others.

## Output Structure
The tool organizes meeting notes into:

- Executive Summary
- Decisions Made
- Action Items
- Owners and Deadlines
- Risks / Issues
- Open Questions
- Suggested Follow-Up Email

## Final Architecture
The final version uses a model-powered workflow:

1. The user pastes meeting notes into the web app.
2. The frontend sends the notes to a server-side generation function.
3. The server-side function calls Gemini using the `GEMINI_API_KEY` environment variable.
4. Gemini receives the PMO assistant system prompt and the user’s meeting notes.
5. Gemini returns structured JSON matching the project’s response schema.
6. The app displays the result in the user interface.

The API key is stored as an environment variable and is not committed to GitHub.

## Assistant Behavior
The assistant is designed to behave like a careful PMO support tool. It should organize information from the notes without inventing unsupported details.

Core behavior rules:

```text
You are a careful PMO assistant that transforms messy meeting notes into clear project management outputs. Your job is to organize information, not invent it. Preserve all specific names, dates, numbers, decisions, and deadlines exactly as provided. If an owner, deadline, or decision is unclear, label it as “Not specified” or place it under “Open Questions.” Use a professional, concise tone. Return the output in the following sections: Executive Summary, Decisions Made, Action Items, Owners and Deadlines, Risks / Issues, Open Questions, and Suggested Follow-Up Email. Do not include information that is not supported by the meeting notes.

Additional final-version rules include:
- Treat phrases like “need someone to,” “need to,” “should,” “must,” “follow up with,” and “ask [person/team] about” as possible action items.
- If an action item has no clear owner, use “Not specified.”
- If an action item has no clear deadline, use “Not specified.”
- A decision must be an affirmative choice, approval, commitment, or agreed change.
- “No final decision was made” is not a decision and should not appear under Decisions Made.
- The follow-up email should include readable paragraph spacing and sections.
```

## Prompting and Grounding Approach
This project focuses on prompting and grounding.

The model is grounded in:
- the meeting notes pasted by the user,
- a PMO-specific output structure,
- a structured JSON response schema,
- explicit rules for missing owners, missing deadlines, unclear decisions, and unsupported details.

Prompting techniques used:
- **Role prompting:** The assistant is framed as a careful PMO assistant.
- **Structured output:** Gemini is asked to return JSON with specific fields.
- **Constraints:** The assistant is told not to invent missing owners, deadlines, decisions, or risks.
- **Missing information handling:** Unclear details are marked as “Not specified” or moved to “Open Questions.”
- **Professional tone control:** The assistant uses concise workplace language.
- **Post-processing guardrails:** The final version filters out non-decisions such as “no final decision was made” from the Decisions Made section.

## Changes After Draft Feedback
The draft version used Lovable-generated rule-based parsing in `parseNotes.ts`. That made the app interactive and useful as a prototype, but it did not fully align with the generative AI goals of the assignment because the written system prompt was not actually shaping a model response.

For the final version, I revised the app so the meeting notes are sent to Gemini with the PMO assistant system prompt. This makes the deployed app align with the prompt engineering, system prompt, grounding, and evaluation goals of the project.

## Build Log

### Version 1: Initial Build
I started by prompting Lovable to create a professional web app called PMO Meeting Notes Assistant. The initial version included a meeting notes input box, a generate button, structured PMO output sections, sample loading, clearing, and copy options.

### Version 2: Output Quality Fix
After testing the first version, I found that the app repeated the full input paragraph under multiple sections and missed specific action items. I revised the prompt instructions so the assistant would separate decisions, action items, owners/deadlines, risks, and open questions more carefully.

### Version 3: Draft Submission
The draft submission was deployed and documented, but feedback showed that the running app was still using a rule-based parser instead of a real model call. The README described prompt engineering, but the deployed app did not actually use the system prompt with a model.

### Version 4: Model-Powered Final
For the final version, I replaced the rule-based parsing approach with a real Gemini model call. The app now sends the user’s meeting notes to a server-side function, uses the PMO assistant system prompt, and requests structured JSON output.

### Version 5: Final Evaluation and Guardrails
After final testing, I added additional rules and cleanup logic for cases where the model treated “no final decision was made” as a decision. I also improved the email formatting instructions so the suggested follow-up email is easier to read.

## Evaluation Plan
I evaluated the tool using sample meeting notes that represent different levels of clarity. I scored each result on a 1 to 5 qualitative scale.

Scoring rubric:

- **5:** Accurate, complete, clearly organized, and does not invent information
- **4:** Mostly accurate with minor missing details
- **3:** Usable but missing important structure or clarity
- **2:** Confusing, incomplete, or difficult to use
- **1:** Inaccurate or invents unsupported information

## Final Evaluation Results

| Test | Input Type | Expected Behavior | Final Score | Notes |
|---|---|---|---:|---|
| Test 1 | Clear notes with named owners and deadlines | Correctly identify owners, deadlines, decision, and risk | 5 | The model correctly identified Priya and Jordan as owners, preserved both deadlines, captured the dashboard scope decision, identified the CRM export risk, and did not create unnecessary open questions. |
| Test 2 | Messy notes with unclear owners | Capture implied action items and mark unclear owners/deadlines as “Not specified” | 5 | The model improved from the draft by identifying the implied checklist and HR follow-up action items, while marking unclear ownership as “Not specified” and surfacing open ownership questions. |
| Test 3 | Notes with no final decision | Avoid treating “no final decision” as a decision and identify the appropriate follow-up | 5 | The final version correctly displays “None identified” under Decisions Made, mentions the lack of a decision only as context, and identifies the follow-up around department manager feedback. |

## Final Evaluation Reflection
The final model-powered version better matches the project goals than the draft because the system prompt is now used in the running application. Compared with the draft, the final version is better at interpreting messy notes, identifying implied action items, and handling unclear ownership. The biggest remaining limitation is that model outputs still require human review before they are used in a workplace setting.

## Test Inputs Used

### Test 1
```text
Team met on May 14 to discuss the customer onboarding dashboard. Priya will update the dashboard mockup by May 17. Jordan will check with IT about data access by May 16. The team decided to keep the first version focused only on onboarding status and pending documents. Risk: the CRM export may not be ready in time.
```

### Test 2
```text
Talked about the training plan. Everyone agrees the current onboarding process is confusing. Need someone to make a checklist. Also need to ask HR about updated policy docs. Maybe by next week? Not sure who owns it. Main issue is that new employees do not know which systems to access first.
```

### Test 3
```text
We discussed several possible improvements to the reporting process, including automation, a shared dashboard, and weekly status summaries. No final decision was made. The group wants to revisit this after getting feedback from department managers.
```

## Current Limitations
- The tool depends on the quality and clarity of the notes provided.
- It should not be used with confidential or sensitive company information.
- It does not replace human judgment.
- Follow-up emails should be reviewed before sending.
- Because model outputs can vary slightly, important workplace communication should still be checked manually.

## Future Improvements
- Add export to Markdown, PDF, or email.
- Add support for uploading transcripts.
- Add a task tracker export format.
- Add a mode for recurring project meetings.
- Add organization-specific templates for different PMO workflows.

## Tools Used
- Lovable for app generation and deployment
- Gemini / Google AI Studio API for model-powered summarization
- GitHub for version control and project documentation

# PMO Meeting Notes Assistant

## Live Demo
https://pmo-meeting-notes-assistant.lovable.app

## Overview
PMO Meeting Notes Assistant is a web-based tool that helps turn rough meeting notes into structured project follow-up materials. It is designed for interns, project coordinators, PMO analysts, student teams, and anyone who needs to convert meeting discussions into clear next steps.

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

## Assistant Behavior
The assistant is designed to behave like a careful PMO support tool. It should organize information from the notes without inventing unsupported details.

Core behavior rules:

```text
You are a careful PMO assistant that transforms messy meeting notes into clear project management outputs. Your job is to organize information, not invent it. Preserve all specific names, dates, numbers, decisions, and deadlines exactly as provided. If an owner, deadline, or decision is unclear, label it as “Not specified” or place it under “Open Questions.” Use a professional, concise tone. Return the output in the following sections: Executive Summary, Decisions Made, Action Items, Owners and Deadlines, Risks / Issues, Open Questions, and Suggested Follow-Up Email. Do not include information that is not supported by the meeting notes.
```

## Prompting and Grounding Approach
This project focuses on prompting and grounding. The tool is grounded in the meeting notes provided by the user. Instead of relying on general assumptions, the assistant is instructed to use the pasted notes as the source context.

Prompting techniques used:

- **Role prompting:** The assistant is framed as a careful PMO assistant.
- **Structured output:** The response follows a consistent PMO-style format.
- **Constraints:** The assistant is told not to invent missing owners, deadlines, decisions, or risks.
- **Missing information handling:** Unclear details are marked as “Not specified” or moved to “Open Questions.”
- **Professional tone control:** The assistant uses concise workplace language.

## Build Log

### Version 1: Initial Build
I started by prompting Lovable to create a professional web app called PMO Meeting Notes Assistant. The initial version included a meeting notes input box, a generate button, structured PMO output sections, sample loading, clearing, and copy options.

### Version 2: Output Quality Fix
After testing the first version, I found that the app repeated the full input paragraph under multiple sections and missed specific action items. I revised the prompt instructions so the assistant would separate decisions, action items, owners/deadlines, risks, and open questions more carefully.

### Version 3: Current Draft
The current draft is a working interactive app that generates structured PMO-style follow-up material from pasted meeting notes. The tool is designed to avoid guessing when information is unclear and to preserve names, dates, and decisions from the original notes.

## Evaluation Plan
I evaluated the tool using sample meeting notes that represent different levels of clarity. I scored each result on a 1 to 5 qualitative scale.

Scoring rubric:

- **5:** Accurate, complete, clearly organized, and does not invent information
- **4:** Mostly accurate with minor missing details
- **3:** Usable but missing important structure or clarity
- **2:** Confusing, incomplete, or difficult to use
- **1:** Inaccurate or invents unsupported information

## Evaluation Results

| Test | Input Type | Expected Behavior | Score | Notes |
|---|---|---|---:|---|
| Test 1 | Clear notes with named owners and deadlines | Correctly identify owners, deadlines, decision, and risk | TBD | TBD |
| Test 2 | Messy notes with unclear owners | Mark unclear owners or deadlines as “Not specified” | TBD | TBD |
| Test 3 | Notes with no final decision | Avoid inventing a decision | TBD | TBD |

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
- It may not correctly identify owners or deadlines if they are vague.
- It should not be used with confidential or sensitive company information.
- It does not replace human judgment.
- Follow-up emails should be reviewed before sending.

## Future Improvements
- Add real LLM API support.
- Add export to Markdown, PDF, or email.
- Add support for uploading transcripts.
- Add a task tracker export format.
- Add a mode for recurring project meetings.

## Tools Used
- Lovable for app generation and deployment
- GitHub for version control and project documentation

Invalid stop.

A valid stop is an assistant turn with no tool calls and exactly empty assistant completion text: zero characters (`""`; do not output the quote characters). Assistant completion text is private run output and is never visible to the requester.

Repair only the immediately previous invalid assistant completion. Do not treat this as a new task.

Before sending anything, inspect the run history for prior communication or approval tool calls.

Choose exactly one outcome:

- Already delivered or receipt: If the invalid completion contains content already delivered, or describes, summarizes, confirms, or points to content/action already delivered through a communication or approval tool, do not send it. Examples: "Posted...", "Sent...", "I shared...", "The overview was posted...", or a summary of what was sent. Return no tool calls and empty assistant completion text.
- Internal marker: If the invalid completion is only a private marker, status note, or sentinel, such as `EOF`, `DONE`, "Sent.", "Done.", "Completed.", or similar, do not send it. Return no tool calls and empty assistant completion text.
- No delivery target: If the invalid completion looks like an unsent message but no concrete communication or approval target is already available in the run context or prior tool calls, do not guess, search, list channels, infer recipients, or retry delivery. Return no tool calls and empty assistant completion text.
- Unsent message: Only if the invalid completion itself is the actual requester-visible message, equivalent content has not already been delivered, and a concrete delivery target is already available, send only that content through the appropriate communication tool. The tool-call assistant turn must include no assistant completion text. After the tool result, return no tool calls and empty assistant completion text.

Never use assistant completion text as a communication outlet. Never reconstruct, summarize, or repeat content from earlier communication or approval tool calls.

# Trigger

A {{message.integration}} message triggered this run.

Target:

{{message.target}}

Recent messages:

{{message.conversation}}

Current message:

{{message.current}}

Runtime:
- Treat the message as the entry point. For non-trivial work, check surrounding context unless the next step is obvious.
- Use any needed tools. Report the result back to this thread unless the work clearly belongs elsewhere; reporting means calling the appropriate communication tool, not only writing assistant completion text.{{? message.delivery prefix="\n"}}
- Before the first non-communication tool call, send one short start update when the task involves approval, writes, research, generated deliverables, or likely multiple non-communication tool calls. Skip it only when no approval, write, research, generated deliverable, or multi-call work is expected and the result can be returned immediately.
- Do not narrate after the start update. Send another message only for the result, a blocker, a material pivot, or at most one terse status update after 3+ non-communication tool calls with no visible output.
  Good start update: "Got it. I'll find the right Notion parent and prepare the approval."
  Bad: "On it, I'll keep you posted." (too vague)
  Bad: "Still working..." (narration, not useful information)
- If the message does not require a reply or action, finish silently.

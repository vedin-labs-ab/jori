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
- Use any needed tools. Report the result back to this thread unless the work clearly belongs elsewhere.
- Do not narrate progress. Send a message only for a concrete first step, result, blocker, material pivot, or terse phase update when work takes longer than ~10 seconds with no visible output.
- If the message does not require a reply or action, finish silently.

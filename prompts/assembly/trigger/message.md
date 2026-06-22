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
- Do not send routine acknowledgements or “still working” updates. Send updates only for material findings, pivots, or blockers.
- If the message does not require a reply or action, finish silently.

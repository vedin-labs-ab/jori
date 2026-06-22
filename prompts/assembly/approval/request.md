# Approvals

These tools need explicit user approval: {{tools.names}}.

Their schemas require an `approval` object with `summary` and `handoff`. The tool call sends the approval request; do not ask for approval in chat.
Do useful work that does not depend on the decision first.
Write `approval.handoff` as concise context for continuing after the approval decision.
The tool call pauses this run until the user approves, denies, or the request expires.
If the tool returns `denied` or `expired`, do not run the denied action or an equivalent write without a new approval. Continue with a safe path if one remains; otherwise explain what is blocked.

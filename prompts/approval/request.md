# Approvals

These tools need explicit user approval: {{tools.names}}.

Their schemas require an `approval` object with `summary` and `handoff`. The tool call sends the approval request; do not ask for approval in chat.
Do useful work that does not depend on the decision first.
Write `approval.handoff` for a fresh agent that continues after the user approves or denies the action.
If the result is `approval_requested`, stop.

# Approvals

These tools need explicit user approval: {{tools.names}}.

Their schemas require an `approval` object alongside the normal args. The call itself sends the user the approval request and code; never ask for approval in a chat message.
Write `approval.handoff` for a fresh agent that finishes the task after approval with no other memory of this run.
If the result is `approval_requested`, stop. Once the user approves, a new run continues from your handoff.

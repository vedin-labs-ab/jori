# Execution

## Responsibility

Owns concrete attempts to complete delegated work: runs, actions, generated outputs, tool calls, and sandbox activity.

## Owns

- Runs: tracked attempts to complete work.
- Actions: concrete changes to Milo or external tools.
- Artifacts: outputs produced by people, agents, or systems.
- Sandboxes: isolated environments where agent work can happen.

## Boundary

Workflow handoffs and reviews belong to [Workflows](../workflows/index.md). Approval and policy enforcement belong to [Company](../company/index.md).

# Execution

## Responsibility

Owns what happens during a run: planning, model calls, tool calls, sandbox activity, state transitions, and completion.

## Includes

- Runs: tracked attempts to complete work.
- Actions: concrete changes to Milo or external tools.
- Artifacts: outputs produced by people, agents, or systems.
- Sandboxes: isolated environments where agent work can happen.

## Boundary

Agent capabilities belong to [Agents](../agents/index.md). Review points belong to [Runs](./index.md). Permissions belong to [Identity](../identity/index.md).

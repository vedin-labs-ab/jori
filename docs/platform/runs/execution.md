# Execution

## Responsibility

Owns what happens during a run: planning, model calls, tool calls, sandbox activity, state transitions, and completion.

## Includes

- State such as queued, running, blocked, completed, or failed.
- Actions that change Milo or external tools.
- Artifacts produced by people, agents, or systems.
- Sandbox activity where agent work happens.

## Boundary

Agent capabilities belong to [Agents](../agents/index.md). Review points belong to [Attention](../attention/index.md). Permissions belong to [Identity](../identity/index.md).

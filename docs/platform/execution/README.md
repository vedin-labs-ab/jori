# Execution

## Responsibility

Owns concrete runs, actions, generated outputs, sandbox activity, and handoffs.

## Owns

- Runs: tracked attempts to complete work.
- Jobs: executable units inside a run.
- Actions: concrete changes to Milo or external tools.
- Sandboxes: isolated environments where agent work can happen.
- Artifacts: outputs produced by people, agents, or systems.
- Handoffs: transitions back to people, agents, tools, or workflows.

## Boundary

Approval and policy enforcement belong to [Control](../control/README.md).

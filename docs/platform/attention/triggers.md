# Triggers

## Responsibility

Owns events that ask Milo to pay attention, become active, resume attention, or start a run.

## Includes

- Manual triggers from explicit user commands or mentions.
- Scheduled triggers from time-based routines.
- Signal triggers from messages, meetings, imports, and integration events.
- State triggers from changes to memory, identity, permissions, or prior runs.

## Boundary

Observed activity belongs to [Context](../context/index.md). Durable attention state belongs to [Activations](./activations.md). Execution attempts belong to [Runs](../runs/index.md).

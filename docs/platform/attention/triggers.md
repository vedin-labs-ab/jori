# Triggers

## Responsibility

Owns events that ask Milo to pay attention, become active, route a review, or start an execution.

## Includes

- Manual triggers from explicit user commands or mentions.
- Scheduled triggers from time-based routines.
- Signal triggers from messages, meetings, imports, and integration events.
- State triggers from prior executions.

## Boundary

Observed activity belongs to [Sources](../context/sources.md). Durable attention state belongs to [Activations](./activations.md). Execution attempts belong to [Execution](../runs/execution.md).

## Draft Schema

```ts
triggers: defineTable({
  externalTenantId: v.string(),
  sourceId: v.optional(v.id("sources")),
  kind: v.union(v.literal("manual"), v.literal("scheduled"), v.literal("signal"), v.literal("state")),
  payload: v.any(),
  createdAt: v.number(),
})
```

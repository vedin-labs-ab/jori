# Triggers

## Responsibility

Owns events that ask Milo to pay attention, become active, or start an execution.

## Includes

- Manual triggers from explicit user commands or mentions.
- Scheduled triggers from time-based routines.
- Message triggers from provider messages and events.

## Boundary

Observed activity belongs to [Messages](../context/messages.md). Durable attention state belongs to [Activations](./activations.md). Execution attempts belong to [Execution](../runs/execution.md).

## Draft Schema

```ts
triggers: defineTable({
  tenantId: v.string(),
  messageId: v.optional(v.id("messages")),
  type: v.union(v.literal("manual"), v.literal("scheduled"), v.literal("message")),
  data: v.optional(v.any()),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
})
```

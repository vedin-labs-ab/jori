# Triggers

## Responsibility

Stores the reason Milo may start work.

## Includes

- `message`: a Slack message asks Milo to work.
- `manual`: a user starts Milo from Milo-owned UI or an admin action.
- `scheduled`: a future scheduled job starts Milo.

## Boundary

Message content belongs to [Messages](../context/messages.md). Durable listening state belongs to [Activations](./activations.md). Runs belong to [Executions](../runs/execution.md).

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

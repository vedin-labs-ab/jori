# Triggers

## Responsibility

Stores the reason Milo may start work.

## Includes

- `message`: an observed external message asks Milo to work.
- `manual`: a user starts Milo from Milo-owned UI or an admin action.
- `scheduled`: a future scheduled job starts Milo.
- A typed source reference when the trigger came from a message or schedule.

## Boundary

Message content belongs to [Messages](../context/messages.md). Schedule definitions belong to [Scheduling](../scheduling.md). Runs belong to [Executions](../runs/executions.md).

Every execution has exactly one trigger. Runtime input is resolved through that trigger, so the trigger is the canonical cause of a run.

## Draft Schema

```ts
triggers: defineTable({
  tenantId: v.string(),
  messageId: v.optional(v.id("messages")),
  scheduleId: v.optional(v.id("schedules")),
  type: v.union(v.literal("manual"), v.literal("scheduled"), v.literal("message")),
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
```

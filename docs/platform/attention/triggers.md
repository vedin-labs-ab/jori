# Triggers

## Responsibility

Stores the reason Milo may start work.

## Includes

- `source_item`: an observed external item asks Milo to work.
- `manual`: a user starts Milo from Milo-owned UI or an admin action.
- `scheduled`: a future scheduled job starts Milo.

## Boundary

Source item content belongs to [Source Items](../context/source-items.md). Durable listening state belongs to [Activations](./activations.md). Runs belong to [Executions](../runs/executions.md).

## Draft Schema

```ts
triggers: defineTable({
  tenantId: v.string(),
  sourceItemId: v.optional(v.id("sourceItems")),
  type: v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("source_item")
  ),
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
```

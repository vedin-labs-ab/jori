# Organizations

## Responsibility

Owns the company boundary for identity, context, integrations, permissions, and agent behavior.

## Draft Schema

```ts
organizations: defineTable({
  name: v.string(),
  slug: v.string(),
  status: v.union(v.literal("active"), v.literal("disabled")),
  createdAt: v.number(),
})
```

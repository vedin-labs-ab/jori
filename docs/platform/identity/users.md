# Users

## Responsibility

Owns the human actors Milo can identify, notify, assign work to, ask for review, or represent in traces.

## Draft Schema

```ts
users: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("invited"), v.literal("disabled")),
  createdAt: v.number(),
})
```

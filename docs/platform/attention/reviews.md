# Reviews

## Responsibility

Owns human checkpoints where people approve, reject, edit, redirect, or escalate Milo behavior before it proceeds.

## Draft Schema

```ts
reviews: defineTable({
  organizationId: v.id("organizations"),
  runId: v.optional(v.id("runs")),
  requestedBy: v.optional(v.id("users")),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("redirected")),
  reason: v.optional(v.string()),
  createdAt: v.number(),
})
```

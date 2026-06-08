# Reviews

## Responsibility

Owns human checkpoints where people approve, reject, edit, redirect, or escalate Milo behavior before it proceeds.

## Includes

- Verification requests Milo asks for in the source conversation.
- User confirmations for dangerous or unclear actions.
- The specific plan Milo asked the user to approve.
- Records of which external user confirmed an action and why Milo needed verification.
- Review state that a later Milo execution can use before performing confirmed work.

## Draft Schema

```ts
reviews: defineTable({
  externalTenantId: v.string(),
  executionId: v.id("executions"),
  requestedByExternalUserId: v.optional(v.string()),
  decidedByExternalUserId: v.optional(v.string()),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("redirected")),
  reason: v.optional(v.string()),
  createdAt: v.number(),
  decidedAt: v.optional(v.number()),
})
```

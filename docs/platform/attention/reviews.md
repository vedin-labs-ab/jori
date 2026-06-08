# Reviews

## Responsibility

Owns human checkpoints where people approve, reject, edit, redirect, or escalate Milo behavior before it proceeds.

## Includes

- Verification requests Milo asks for in the source conversation.
- User confirmations for dangerous or unclear actions.
- The specific plan Milo asked the user to approve.
- Records of who confirmed an action and why Milo needed verification.
- Review state that a later Milo execution can use before performing confirmed work.
- Dreaming proposal approvals through Milo's web console.
- Optional free-text approvals from an organization-configured collaboration channel.
- Organization-specific approval authority, such as admins only or any user in the configured channel.
- Concise confirmation replies in the approval channel after approved work is applied.

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

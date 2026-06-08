# Activations

## Responsibility

Owns durable attention state: where Milo has been invited, what scope it should monitor, and when that attention expires, pauses, or resumes.

## Includes

- Conversation-level activation after a user mentions Milo in a thread.
- Scope across external systems, channels, threads, comments, or other collaboration containers.
- Status such as active, paused, expired, or dismissed.
- Rules for when Milo should stay silent despite continuing to listen.

## Draft Schema

```ts
activations: defineTable({
  organizationId: v.id("organizations"),
  triggerId: v.optional(v.id("triggers")),
  sourceId: v.optional(v.id("sources")),
  scope: v.string(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("expired"), v.literal("dismissed")),
  expiresAt: v.optional(v.number()),
  updatedAt: v.number(),
})
```

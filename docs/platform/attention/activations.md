# Activations

## Responsibility

Owns durable attention state: where Milo has been invited and what scope it should keep monitoring.

## Includes

- Conversation-level activation after a user mentions Milo in a thread.
- Scope across external systems, channels, threads, comments, or other collaboration containers.
- Permanent listening for activated conversations.
- Subsequent messages from the activated conversation, even when they do not mention Milo directly.
- Rules for when Milo should stay silent despite continuing to listen.
- Rules for when Milo should act or reply because a message clearly targets Milo and there is clear value in doing work.

## Draft Schema

```ts
activations: defineTable({
  organizationId: v.id("organizations"),
  triggerId: v.optional(v.id("triggers")),
  sourceId: v.optional(v.id("sources")),
  scope: v.string(),
  updatedAt: v.number(),
})
```

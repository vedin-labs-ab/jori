# Activations

## Responsibility

Owns durable attention state for an external conversation or provider object where Milo has been invited.

## Includes

- Conversation-level activation whenever a user mentions Milo in a thread.
- Activation creation as the invitation for Milo to pay attention to that thread.
- A first mention triggering the agentic flow unless a sandboxed agent instance is already active for the thread.
- Direct provider identifier for the thread.
- Permanent listening for activated conversations.
- Subsequent messages from the activated conversation, even when they do not mention Milo directly.
- Non-mention messages as attention input that may be ignored, kept silent, or used to steer an active sandboxed agent instance.
- Rules for when Milo should stay silent despite continuing to listen.
- Rules for when Milo should act or reply because a message clearly targets Milo and there is clear value in doing work.

## Draft Schema

```ts
activations: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  threadId: v.string(),
  executionId: v.optional(v.id("executions")),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
})
```

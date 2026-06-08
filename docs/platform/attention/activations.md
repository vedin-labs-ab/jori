# Activations

## Responsibility

Stores the external conversation Milo is currently listening to.

## Includes

- One row per activated external conversation.
- The trigger that created the activation.
- The current execution for that conversation, when one is active.

## Draft Schema

```ts
activations: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  conversationId: v.string(),
  executionId: v.optional(v.id("executions")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
```

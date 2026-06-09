# Activations

## Responsibility

Stores external conversations where Milo has been activated.

## Includes

- One row per activated external conversation.
- The trigger that first activated the conversation.
- The integration and conversation identifier used to recognize follow-up messages.

## Boundary

Activations decide whether follow-up messages in a conversation can start Milo work without another explicit mention. Runs belong to [Executions](../runs/executions.md), and each eligible message creates its own execution.

## Draft Schema

```ts
activations: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  conversationId: v.string(),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
```

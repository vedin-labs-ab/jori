# Messages

## Responsibility

Stores observed external messages that can start or continue Milo work.

## Mental Model

- An integration is the connected external account.
- A message is external content Milo observed, such as a Slack message, Teams message, Jira comment, or Linear comment.
- A conversation is the durable discussion Milo is listening to.
- A trigger is the reason Milo starts work from a message, manual action, or schedule.

## Includes

- Provider-native identifiers for dedupe and routing.
- The external actor, conversation, text, and observed time.
- The resolved actor email when a provider can expose it.
- Provider-specific details only when needed.

## Boundary

Messages are inputs. Decisions, tool calls, replies, and outcomes belong to [Traces](../runs/traces.md).

## Draft Schema

```ts
messages: defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  type: v.string(),
  externalId: v.string(),
  actorId: v.optional(v.string()),
  actorEmail: v.optional(v.string()),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
```

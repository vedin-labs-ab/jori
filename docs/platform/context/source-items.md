# Source Items

## Responsibility

Stores observed external items that can start or continue Milo work.

## Mental Model

- An integration is the connected external account.
- A source item is the external item Milo observed, such as a Slack message, Teams message, Jira issue comment, or Linear issue update.
- A conversation is the durable discussion or work surface Milo is listening to.
- A runtime target is derived later from the source item and integration, and is not stored as the source item itself.

## Includes

- Provider-neutral identifiers for dedupe and routing.
- The external author, location, conversation, content, and observed time.
- Provider-specific details only when needed.

## Boundary

Source items are inputs. Decisions, tool calls, replies, and outcomes belong to [Traces](../runs/traces.md).

## Draft Schema

```ts
sourceItems: defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  kind: v.string(),
  externalId: v.string(),
  authorId: v.optional(v.string()),
  locationId: v.optional(v.string()),
  conversationId: v.optional(v.string()),
  content: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
```

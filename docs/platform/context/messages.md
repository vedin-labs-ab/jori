# Messages

## Responsibility

Stores observed Slack messages and events.

## Includes

- Slack identifiers for dedupe and reply routing.
- The Slack actor, channel, thread, text, and event time.
- Raw Slack details only when needed.

## Boundary

Messages are inputs. Decisions, tool calls, replies, and outcomes belong to [Traces](../runs/traces.md).

## Draft Schema

```ts
messages: defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  type: v.string(),
  providerId: v.string(),
  actorId: v.optional(v.string()),
  containerId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  occurredAt: v.optional(v.number()),
  createdAt: v.number(),
})
```

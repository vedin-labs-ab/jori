# Sources

## Responsibility

Owns provider events and messages before Milo turns them into triggers, activations, executions, or traces.

## Includes

- Messages, comments, mentions, and provider events.
- Direct external identifiers for channels, threads, comments, issues, or other provider objects.
- Actor identifiers from the provider event payload.
- Raw payloads when needed for debugging or idempotency.

## Boundary

Sources are observed inputs. Decisions, model calls, tool calls, replies, and outcomes belong to [Traces](../runs/traces.md).

## Draft Schema

```ts
sources: defineTable({
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
})
```

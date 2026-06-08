# Sources

## Responsibility

Owns provider events and messages before Milo turns them into triggers, activations, executions, or traces.

## Includes

- Messages, comments, mentions, and provider events.
- Direct external identifiers for channels, threads, comments, issues, or other provider objects.
- External user identifiers from the provider event payload.
- Raw payloads when needed for debugging or idempotency.

## Boundary

Sources are observed inputs. Decisions, model calls, tool calls, replies, and outcomes belong to [Traces](../runs/traces.md).

## Draft Schema

```ts
sources: defineTable({
  externalTenantId: v.string(),
  integrationId: v.id("integrations"),
  kind: v.string(),
  externalId: v.string(),
  externalUserId: v.optional(v.string()),
  externalContainerId: v.optional(v.string()),
  externalThreadId: v.optional(v.string()),
  text: v.optional(v.string()),
  payload: v.optional(v.any()),
  observedAt: v.number(),
  createdAt: v.number(),
})
```

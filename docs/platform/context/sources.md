# Sources

## Responsibility

Owns raw company inputs before Milo turns them into traces, memory, attention, or agent context.

## Includes

- Messages, email, comments, and threads.
- Meetings and live conversations.
- Files, documents, code, notes, and other artifacts.
- Imports, migrations, and connected-tool activity.

## Boundary

Evidence and activity records belong to [Traces](../runs/traces.md). Durable interpretation belongs to [Memory](./memory.md).

## Draft Schema

```ts
sources: defineTable({
  organizationId: v.id("organizations"),
  integrationId: v.optional(v.id("integrations")),
  kind: v.string(),
  externalId: v.optional(v.string()),
  observedAt: v.number(),
})
```

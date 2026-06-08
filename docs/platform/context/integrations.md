# Integrations

## Responsibility

Stores connected external system accounts.

## Includes

- External account identity.
- Provider-specific credentials needed to read context and send responses.
- Provider-specific metadata. Slack stores `data` as `{ scopes: { bot, user }, team, botId }`.
- Connection status.

## Boundary

External messages become [Messages](./messages.md). Milo work belongs to [Executions](../runs/executions.md).

## Draft Schema

```ts
integrations: defineTable({
  tenantId: v.string(),
  provider: v.string(),
  accountId: v.string(),
  credentials: v.any(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  data: v.optional(v.any()),
})
```

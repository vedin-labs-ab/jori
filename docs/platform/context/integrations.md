# Integrations

## Responsibility

Stores connected Slack installations.

## Includes

- Slack workspace identity.
- Slack bot token for posting replies as Milo.
- Slack user token for reading/searching Slack context with the installing user's permissions.
- Connection status.

## Boundary

Slack events become [Messages](./messages.md). Milo work belongs to [Executions](../runs/executions.md).

## Draft Schema

```ts
integrations: defineTable({
  tenantId: v.string(),
  provider: v.literal("slack"),
  accountId: v.string(),
  botToken: v.string(),
  userToken: v.string(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  data: v.optional(v.any()),
})
```

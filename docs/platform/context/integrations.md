# Integrations

## Responsibility

Stores connected Slack installations.

## Includes

- Slack workspace identity.
- Credential pointer for posting replies.
- Connection status.

## Boundary

Slack events become [Messages](./messages.md). Milo work belongs to [Executions](../runs/executions.md).

## Draft Schema

```ts
integrations: defineTable({
  tenantId: v.string(),
  provider: v.literal("slack"),
  accountId: v.string(),
  tokenId: v.string(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
```

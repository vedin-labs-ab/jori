# Integrations

## Responsibility

Owns connected external systems Milo can receive events from and act through.

## Includes

- Provider installation identity, such as a Slack workspace or Microsoft Teams tenant.
- Tenant identity from Clerk or WorkOS.
- Authorization state.
- Enough provider metadata to receive events and post replies.

## Boundary

Concrete work and replies belong to [Execution](../runs/execution.md). Observed provider events belong to [Messages](./messages.md).

## Draft Schema

```ts
integrations: defineTable({
  tenantId: v.string(),
  provider: v.string(),
  accountId: v.string(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
})
```

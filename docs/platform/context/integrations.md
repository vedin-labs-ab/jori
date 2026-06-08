# Integrations

## Responsibility

Owns connected external systems Milo can receive events from and act through.

## Includes

- Provider installation identity, such as a Slack workspace or Microsoft Teams tenant.
- External tenant identity from Clerk or WorkOS.
- Authorization state and provider scopes.
- Enough provider metadata to receive events and post replies.

## Boundary

Intentional agent behavior belongs to [Agents](../agents/agents.md). Concrete work and replies belong to [Execution](../runs/execution.md). Observed provider events belong to [Sources](./sources.md).

## Draft Schema

```ts
integrations: defineTable({
  externalTenantId: v.string(),
  provider: v.string(),
  externalAccountId: v.string(),
  scopes: v.array(v.string()),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

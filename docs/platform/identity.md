# Identity

## Responsibility

Maps external provider users to Clerk users inside a tenant.

## Mental Model

- Clerk remains the source of truth for Milo users and organizations.
- `userId` stores the raw Clerk user ID.
- Provider identity rows exist only to resolve external messages to a Clerk user before runtime tool injection.
- Google and Microsoft OAuth create verified identity rows for user-scoped mail and calendar tooling.

## Boundary

Identity rows do not store provider credentials. Credentials belong to [Integrations](./integrations.md). Messages store observed external activity, while triggers and executions store the resolved Clerk user when one is known.

## Draft Schema

```ts
identities: defineTable({
  tenantId: v.string(),
  userId: v.string(),
  provider: v.union(v.literal("google"), v.literal("microsoft")),
  providerAccountId: v.string(),
  externalUserId: v.string(),
  email: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

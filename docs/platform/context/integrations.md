# Integrations

## Responsibility

Stores connected external system accounts.

## Includes

- External account identity.
- Provider-specific credentials needed to read context and send responses.
- Provider-specific metadata. Slack stores `data` as `{ scopes: { bot, user }, team, botId }`. Linear stores `data` as `{ appUserId, appUserName, organization }`. Notion stores `data` as `{ botId, workspaceId, workspaceName, workspaceIcon, owner, duplicatedTemplateId }`. Microsoft stores `data` as `{ scopes, tenant, user, adminConsentedAt }`.
- Connection status.

## Boundary

External messages become [Messages](./messages.md). Milo work belongs to [Executions](../runs/executions.md).

Provider user-to-Clerk user resolution belongs to [Identities](./identities.md).

## Draft Schema

```ts
integrations: defineTable({
  tenantId: v.string(),
  provider: v.string(),
  scope: v.optional(v.union(v.literal("tenant"), v.literal("user"))),
  ownerId: v.optional(v.string()),
  accountId: v.string(),
  credentials: v.any(),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  data: v.optional(v.any()),
})
```

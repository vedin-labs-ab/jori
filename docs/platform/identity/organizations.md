# Organizations

## Responsibility

Owns the company boundary for identity, context, integrations, permissions, and agent behavior.

## Includes

- Organization-wide dreaming settings, enabled by default.
- Optional dreaming approval channel for Slack, Teams, or another collaboration tool.
- Organization-specific rule for who may approve dreaming proposals in that channel.

## Draft Schema

```ts
organizations: defineTable({
  name: v.string(),
  slug: v.string(),
  status: v.union(v.literal("active"), v.literal("disabled")),
  dreamingEnabled: v.boolean(),
  dreamingApprovalChannel: v.optional(v.string()),
  dreamingApprovalRole: v.union(v.literal("admin"), v.literal("channel_member")),
  createdAt: v.number(),
})
```

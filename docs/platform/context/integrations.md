# Integrations

## Responsibility

Owns connected systems and the capabilities Milo can safely use through them.

## Includes

- Tools and products linked to Milo.
- Core onboarding integrations such as Slack, Teams, Jira, Linear, GitHub, and similar company tools.
- Collaboration-tool availability configured for all channels or specific channels during onboarding.
- Authorized accounts and installation contexts.
- Scopes that bound external access.
- Capabilities such as read, search, create, update, comment, or execute.
- References to external objects whose source of truth remains outside Milo.

## Boundary

Tool availability belongs here. Intentional tool use belongs to [Agents](../agents/agents.md). Tool calls inside an execution attempt belong to [Execution](../runs/execution.md).

## Draft Schema

```ts
integrations: defineTable({
  organizationId: v.id("organizations"),
  provider: v.string(),
  accountId: v.optional(v.string()),
  scopes: v.array(v.string()),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
  createdAt: v.number(),
})
```

# Agents

## Responsibility

Owns the delegated AI teammates Milo can ask to reason, plan, use tools, and complete work.

## Owns

- [Profiles](./profiles.md)
- [Skills](./skills.md)
- [Tools](./tools.md)

## Boundary

Execution attempts belong to [Execution](../runs/execution.md). Raw company signal belongs to [Sources](../context/sources.md), durable memory belongs to [Memory](../context/memory.md), and agent permissions belong to [Permissions](../identity/permissions.md).

## Draft Schema

```ts
agents: defineTable({
  organizationId: v.id("organizations"),
  profileId: v.id("agentProfiles"),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("disabled")),
  createdAt: v.number(),
})
```

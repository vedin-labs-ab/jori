# Agents

## Responsibility

Owns the default Milo agent an organization can run as the platform persona in company tools.

## Owns

- [Skills](./skills.md)
- [Tools](./tools.md)

## Includes

- One default Milo agent per organization.
- Milo as the conversational persona people experience in Slack, Teams, and other collaboration tools.
- System instructions for how Milo should act, communicate, use tools, and store artifacts.
- Operating guidance that lets Milo decide whether to reply, act, create an artifact, ask for review, or stay silent.
- Safety guidance that limits write actions to intent clearly expressed by the user's message.
- Verification guidance for unclear intent or dangerous actions.

## Boundary

Milo is the platform as a whole; the agent is the runnable AI teammate and persona inside that platform. Execution attempts belong to [Execution](../runs/execution.md). Raw company signal belongs to [Sources](../context/sources.md), durable memory belongs to [Memory](../context/memory.md), and agent permissions belong to [Permissions](../identity/permissions.md).

## Draft Schema

```ts
agents: defineTable({
  organizationId: v.id("organizations"),
  mandate: v.string(),
  modelPreference: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("disabled")),
  updatedAt: v.number(),
})
```

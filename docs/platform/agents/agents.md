# Agents

## Responsibility

Owns the default Milo agent configuration for an external tenant.

## Includes

- One default Milo agent per external tenant.
- Milo as the conversational persona people experience in Slack, Teams, and other collaboration tools.
- System instructions for how Milo should act, communicate, use tools, and store artifacts.
- Operating guidance that lets Milo decide whether to reply, act, create an artifact, ask for review, or stay silent.
- Safety guidance that limits write actions to intent clearly expressed by the user's message.
- Verification guidance for unclear intent or dangerous actions.

## Boundary

Milo is the platform as a whole; the agent is the runnable AI teammate and persona inside that platform. Execution attempts belong to [Execution](../runs/execution.md). Raw company signal belongs to [Sources](../context/sources.md).

## Draft Schema

```ts
agents: defineTable({
  externalTenantId: v.string(),
  mandate: v.string(),
  modelPreference: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("paused"), v.literal("disabled")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

# Tools

## Responsibility

Owns the intentional use of models, integrations, and execution environments available to agents.

## Boundary

Connected-tool availability belongs to [Integrations](../context/integrations.md). Concrete tool calls belong to [Execution](../runs/execution.md).

## Draft Schema

```ts
agentTools: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  kind: v.union(v.literal("model"), v.literal("integration"), v.literal("sandbox")),
  integrationId: v.optional(v.id("integrations")),
  status: v.union(v.literal("available"), v.literal("disabled")),
  createdAt: v.number(),
})
```

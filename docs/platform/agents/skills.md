# Skills

## Responsibility

Owns reusable, company-specific ways for agents to perform work well.

## Boundary

Skill discovery and improvement belongs to [Dreams](../dreaming/dreaming.md). Skill execution inside an attempt belongs to [Execution](../runs/execution.md).

## Draft Schema

```ts
agentSkills: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  description: v.string(),
  instructions: v.string(),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  updatedAt: v.number(),
})
```

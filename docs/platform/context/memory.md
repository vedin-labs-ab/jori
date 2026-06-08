# Memory

## Responsibility

Owns durable company understanding that agents and people can rely on.

## Includes

- Facts Milo can rely on.
- Assumptions Milo should treat as useful but uncertain.
- Preferences for how people, teams, and the company want work to happen.
- Histories of important activity, decisions, and outcomes.
- Boundaries for where memory is valid, visible, fresh, or expired.

## Boundary

Evidence belongs to [Traces](../runs/traces.md). Execution attempts belong to [Execution](../runs/execution.md). Agent-specific improvements belong to [Dreams](../dreaming/dreaming.md).

## Draft Schema

```ts
memories: defineTable({
  organizationId: v.id("organizations"),
  kind: v.union(v.literal("fact"), v.literal("assumption"), v.literal("preference"), v.literal("history")),
  text: v.string(),
  confidence: v.optional(v.number()),
  validUntil: v.optional(v.number()),
  updatedAt: v.number(),
})
```

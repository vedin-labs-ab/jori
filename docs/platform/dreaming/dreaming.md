# Dreaming

## Responsibility

Owns background processes that study company traces and agent work to improve organization-wide skills.

## Owns

- Reflection over sources, memory, runs, outcomes, and user feedback for skill improvement.
- Opportunity discovery where Milo could improve an organization-wide skill.
- Pattern detection across repeated friction, manual effort, and successful runs.
- Suggested creation or adjustment of organization-wide skills.
- Organization-level opt-out from dreaming.
- Skill-level opt-out from dreaming.
- Skill update gates that either require approval or allow automatic updates.
- Approval proposals sent to Milo's web console by default.
- Optional approval proposals sent to an organization-configured Slack, Teams, or other collaboration channel.
- Proposal summaries with before, after, and delta artifacts.
- Concise confirmation replies in the approval channel after an approved skill update is applied.

## Boundary

Dreaming proposes skill improvements only. [Agents](../agents/agents.md) own active capabilities and skill update settings. [Execution](../runs/execution.md) owns execution attempts. [Permissions](../identity/permissions.md) own permission to apply sensitive changes.

## Draft Schema

```ts
dreams: defineTable({
  organizationId: v.id("organizations"),
  kind: v.union(v.literal("reflection"), v.literal("opportunity"), v.literal("pattern")),
  summary: v.string(),
  status: v.union(v.literal("open"), v.literal("accepted"), v.literal("dismissed")),
  createdAt: v.number(),
})
```

# Artifacts

## Responsibility

Owns outputs produced by runs, such as summaries, files, code changes, plans, reports, comments, or proposed updates.

## Draft Schema

```ts
artifacts: defineTable({
  organizationId: v.id("organizations"),
  runId: v.id("runs"),
  kind: v.string(),
  title: v.string(),
  uri: v.optional(v.string()),
  createdAt: v.number(),
})
```

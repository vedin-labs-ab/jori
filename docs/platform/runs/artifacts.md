# Artifacts

## Responsibility

Owns durable outputs produced by executions that should remain available as historical records.

## Includes

- Durable outputs Milo decides are useful to preserve beyond the source conversation.
- Historical snapshots that should be accurate for when they were produced, even if they become stale later.
- References to generated files, reports, proposed changes, plans, and other work products.
- Conversation replies when they are important enough to preserve as execution outputs.
- Before, after, and delta attachments for dreaming proposals.
- Raw or detailed onboarding research outputs, such as gathered organization website data.

## Draft Schema

```ts
artifacts: defineTable({
  organizationId: v.id("organizations"),
  executionId: v.id("executions"),
  kind: v.string(),
  title: v.string(),
  uri: v.optional(v.string()),
  createdAt: v.number(),
})
```

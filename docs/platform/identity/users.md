# Users

## Responsibility

Owns the human actors Milo can identify, notify, assign work to, ask for review, or represent in traces.

## Includes

- Users discovered or invited during organization onboarding.
- User identity mapped from connected tools such as Slack, Teams, Jira, Linear, or GitHub.

## Draft Schema

```ts
users: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("invited"), v.literal("disabled")),
  createdAt: v.number(),
})
```

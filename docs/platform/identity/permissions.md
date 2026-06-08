# Permissions

## Responsibility

Owns access and autonomy rules: what people and agents may see, trigger, change, delegate, approve, or execute.

## Includes

- Membership and role-derived access.
- Connected-tool scopes and account grants.
- Policies that constrain data use, execution, and autonomy.
- Trust thresholds for when Milo must ask, escalate, or stop.

## Draft Schema

```ts
permissions: defineTable({
  organizationId: v.id("organizations"),
  subjectType: v.union(v.literal("user"), v.literal("agent")),
  subjectId: v.string(),
  action: v.string(),
  scope: v.string(),
  createdAt: v.number(),
})
```

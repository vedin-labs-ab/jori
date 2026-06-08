# Profiles

## Responsibility

Owns agent identity and configuration: mandate, default behavior, model preferences, tool defaults, autonomy limits, and company-specific operating constraints.

## Draft Schema

```ts
agentProfiles: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  mandate: v.string(),
  modelPreference: v.optional(v.string()),
  autonomyLevel: v.union(v.literal("ask"), v.literal("review"), v.literal("act")),
  updatedAt: v.number(),
})
```

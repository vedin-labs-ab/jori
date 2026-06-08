# Skills

## Responsibility

Stores durable, task-specific instructions that shape Milo's runtime behavior.
Milo's default persona belongs to the system prompt, not the skill catalog.

## Includes

- Global skills with `tenantId: null`.
- Tenant skills with `tenantId` set to the owning Clerk organization.
- Open skill content shaped like `SKILL.md`: a lowercase hyphenated name, a natural-language description, and Markdown instructions.

## Boundary

Global skills are synced from checked-in `skills/<skill>/SKILL.md` files and are immutable through tenant-facing APIs. Tenant skills can be created, edited, and deleted only by users whose active Clerk organization matches the skill tenant.

Runtime prompt assembly loads the system prompt from checked-in prompt
templates, then loads global skills plus the triggering tenant's skills from
Convex before starting Codex.

## Draft Schema

```ts
skills: defineTable({
  tenantId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  body: v.string(),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

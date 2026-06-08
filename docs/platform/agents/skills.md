# Skills

## Responsibility

Owns reusable ways for agents to perform work and communicate well in company tools.

## Includes

- Milo-provided global skills that ship as stable defaults and are not company-editable.
- Organization-wide skills for company-specific operating instructions.
- Platform-specific communication practices, such as how Milo should talk in Slack, Jira, Linear, or other tools.
- Platform-native presentation guidance, such as when to use Slack Block Kit or other supported UI formats.
- Guidance for formatting verification requests, updates, and artifacts in the target platform.
- Skill management through Milo's console UI, conversation with Milo, and accepted dreaming improvements.
- Per-skill dreaming settings, enabled by default for organization-wide skills.
- Per-skill dreaming update mode, requiring approval by default unless automatic updates are allowed.

## Boundary

Skill discovery and proposed improvements belong to [Dreams](../dreaming/dreaming.md). Skill execution inside an attempt belongs to [Execution](../runs/execution.md).

## Draft Schema

```ts
agentSkills: defineTable({
  organizationId: v.optional(v.id("organizations")),
  scope: v.union(v.literal("global"), v.literal("organization")),
  name: v.string(),
  description: v.string(),
  instructions: v.string(),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  dreamingEnabled: v.optional(v.boolean()),
  dreamingUpdateMode: v.optional(v.union(v.literal("approval"), v.literal("automatic"))),
  updatedAt: v.number(),
})
```

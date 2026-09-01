import { type MutationCtx } from "../_generated/server"
import { normalizeSkillInput } from "../skills/data"
import { clearOrganization, daysAgo, type SeedContext } from "./context"
import { resolveOwner } from "./people"

// The house procedures Vedin Labs has written down for Jori. Global skills
// arrive from the catalog sync and belong to no organization; these are the
// organization's own, and they encode the same norms the place claims state
// in shorter form.

type SeedSkill = {
  name: string
  description: string
  category: "communication" | "creation" | "operations" | "research"
  integrations?: ("github" | "linear" | "notion" | "slack")[]
  /** Days before the seed instant it was written and last edited. */
  created: number
  updated: number
  body: string[]
}

const skills: SeedSkill[] = [
  {
    name: "escalation-brief",
    description:
      "File a support escalation the way Vedin Labs writes them: customer, plan, what they cannot do, and who owns it.",
    category: "operations",
    integrations: ["slack"],
    created: 78,
    updated: 21,
    body: [
      "# Filing an escalation",
      "",
      "Escalations go in the Support escalations table, one row per problem, never one per message.",
      "",
      "1. Name the customer exactly as the Customer accounts table names them. Never use shorthand.",
      "2. Say what the customer cannot do right now, in their words before ours.",
      "3. Severity is High only when a customer is blocked from working. Everything else is Medium or Low.",
      "4. Set Owner to the person who will actually fix it, resolved by name in #support, not by broadcast.",
      "5. Leave Resolved false until the customer has confirmed, not when the fix ships.",
      "",
      "Post a one-line summary in the #support thread linking the row. Do not send the customer anything yourself.",
    ],
  },
  {
    name: "renewal-brief",
    description:
      "Prepare an account for renewal: usage, incident history, open asks, and the position to take on price.",
    category: "research",
    integrations: ["slack"],
    created: 64,
    updated: 16,
    body: [
      "# Renewal brief",
      "",
      "Write these five sections and nothing else.",
      "",
      "**Numbers.** Seats, plan, MRR, and the renewal date from the Customer accounts table. Add active seats over the last 30 days.",
      "",
      "**Usage.** Which teams use Jori and what for. Name the automations that actually run.",
      "",
      "**History.** Every escalation this account raised, and how it ended. Incidents that touched them count even if they never noticed.",
      "",
      "**Open asks.** Read the Feature requests table for rows this account asked for. Say what shipped and what did not, without promising dates.",
      "",
      "**Position.** Recommend a price. The maximum discount in the Pricing store is a ceiling, not an opening offer.",
    ],
  },
  {
    name: "shipped-post",
    description:
      "Draft the Friday shipped post for #general from the week's merged work.",
    category: "communication",
    integrations: ["github", "linear", "slack"],
    created: 52,
    updated: 10,
    body: [
      "# Friday shipped post",
      "",
      "One short paragraph, then a list. Three to six items, each one line.",
      "",
      "- Write what a customer can now do, not what the pull request was called.",
      "- Numbers over adjectives: say 820ms, not much faster.",
      "- Anything still behind a flag gets said plainly, with who it is on for.",
      "- Nothing that only matters internally.",
      "",
      "Draft it. A person posts it, because #general is not a channel Jori speaks in unprompted.",
    ],
  },
  {
    name: "incident-timeline",
    description:
      "Keep the #incidents thread as a timeline and turn it into a postmortem when the incident closes.",
    category: "operations",
    integrations: ["slack"],
    created: 44,
    updated: 24,
    body: [
      "# Incidents",
      "",
      "One thread per incident. Every update is timestamped and goes in the thread, never in the channel.",
      "",
      "While it is open, keep a running timeline: what was observed, what was tried, what it ruled out.",
      "",
      "When it closes, draft a postmortem into Engineering / Incidents with these headings: Impact, Cause, Why it took as long as it did, Fix, Follow-ups.",
      "",
      "Impact is counted in customers and hours, not in severity labels. Follow-ups are concrete enough to become work; if one cannot be, it is not a follow-up.",
      "",
      "Page someone only for what the On-call rota store lists under wakeFor.",
    ],
  },
]

export async function seedSkills(ctx: MutationCtx, seed: SeedContext) {
  const ownerId = await resolveOwner(ctx, seed)

  await clearOrganization(ctx, ["skills"], seed.organizationId)

  for (const skill of skills) {
    await ctx.db.insert("skills", {
      organizationId: seed.organizationId,
      ...normalizeSkillInput({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        associatedIntegrations: skill.integrations,
        body: skill.body.join("\n"),
      }),
      createdBy: ownerId,
      createdAt: daysAgo(seed, skill.created, 12),
      updatedAt: daysAgo(seed, skill.updated, 15),
    })
  }

  return skills.length
}

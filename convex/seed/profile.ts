import {
  isUserVisibleToolPermission,
  toolPermissions,
} from "../../contracts/permissions"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createPersonActor } from "../shared/actor"
import {
  clearOrganization,
  dayMs,
  daysAgo,
  type SeedContext,
  seedTimezone,
} from "./context"
import { resolveOwner } from "./people"

// Who Vedin Labs is, the pages that fact is drawn from, and the handful of
// tool permissions a team actually narrows once it has been running Jori for
// a while. Source rows are stamped with a future check time: the daily
// watcher only crawls what is due, so a seeded deployment stays quiet.

const facts = {
  name: "Vedin Labs",
  aliases: ["Jori", "Vedin Labs AB"],
  domains: ["vedinlabs.com", "usejori.com"],
  summary:
    "Vedin Labs builds Jori, an AI teammate a whole company shares. Jori sits in the tools a team already works in — Slack, Linear, GitHub, Notion — keeps its own picture of what the company is working on, and takes work end to end rather than answering one question at a time. The company is based in Stockholm and sells to product and operations teams at companies between roughly 50 and 500 people.",
}

const sources = [
  { url: "https://usejori.com", primary: true },
  { url: "https://usejori.com/pricing", primary: false },
  { url: "https://usejori.com/trust", primary: false },
  { url: "https://vedinlabs.com/about", primary: false },
]

/** Tools this organization has moved off their default. Writes that leave a
 *  trace outside Slack are held for a person to approve, and the two that
 *  destroy something are off while the team is still watching what Jori does. */
const narrowed = [
  { tool: "github_commit_to_pull_request", mode: "blocked" as const },
  { tool: "github_create_pull_request", mode: "prompted" as const },
  { tool: "google_gmail_send_message", mode: "prompted" as const },
  { tool: "notion_update_page", mode: "prompted" as const },
  { tool: "delete_table_row", mode: "prompted" as const },
  { tool: "delete_automation", mode: "blocked" as const },
]

export async function seedProfile(ctx: MutationCtx, seed: SeedContext) {
  const ownerId = await resolveOwner(ctx, seed)
  const approvedAt = daysAgo(seed, 96, 14, 20)
  const existing = await ctx.db
    .query("organizationProfile")
    .withIndex("by_organization", (index) =>
      index.eq("organizationId", seed.organizationId)
    )
    .unique()
  const profile = {
    organizationId: seed.organizationId,
    ...facts,
    declared: {
      domains: ["vedinlabs.com"],
      timezone: seedTimezone,
    },
    approvedAt,
    approvedBy: createPersonActor(ownerId),
    updatedAt: approvedAt,
  }

  if (existing === null) {
    await ctx.db.insert("organizationProfile", profile)
  } else {
    await ctx.db.patch(existing._id, profile)
  }

  await seedSources(ctx, seed)

  return await seedPermissions(ctx, seed, ownerId)
}

/** The first-party pages the profile was drafted from, already crawled and
 *  not due again for a fortnight. */
async function seedSources(ctx: MutationCtx, seed: SeedContext) {
  await clearOrganization(ctx, ["organizationSources"], seed.organizationId)

  for (const [index, source] of sources.entries()) {
    await ctx.db.insert("organizationSources", {
      organizationId: seed.organizationId,
      url: source.url,
      primary: source.primary,
      hash: `seed-${index}-${source.url.length}`,
      changedAt: daysAgo(seed, 96 + index, 3),
      checkAt: seed.now + 14 * dayMs,
    })
  }
}

async function seedPermissions(
  ctx: MutationCtx,
  seed: SeedContext,
  updatedBy: Id<"persons">
) {
  await clearOrganization(ctx, ["permissions"], seed.organizationId)

  const configurable = new Set(
    toolPermissions
      .filter(
        (permission) =>
          permission.defaultMode !== "required" &&
          isUserVisibleToolPermission(permission.tool)
      )
      .map((permission) => permission.tool)
  )

  let written = 0

  for (const [index, override] of narrowed.entries()) {
    if (!configurable.has(override.tool)) {
      continue
    }

    await ctx.db.insert("permissions", {
      organizationId: seed.organizationId,
      tool: override.tool,
      mode: override.mode,
      updatedBy,
      updatedAt: daysAgo(seed, 62 - index * 9, 11),
    })
    written += 1
  }

  return written
}

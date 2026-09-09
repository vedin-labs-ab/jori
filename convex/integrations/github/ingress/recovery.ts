import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalAction, internalMutation } from "../../../_generated/server"
import { findActiveIntegrationByExternalId } from "../../data"
import { githubAppPage, githubAppRequest } from "../app"

const recoveryWindowMs = 3 * 24 * 60 * 60 * 1000
const retryDelayMs = 10 * 60 * 1000

type GitHubDelivery = {
  id: number
  guid: string
  delivered_at: string
  status_code: number | null
  installation_id?: number | null
}

// GitHub does not retry failed webhooks. Read metadata from this region's
// registration and ask GitHub to resend to that app's configured receiver.
export const sweep = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
      return
    }
    const query = new URLSearchParams({ per_page: "100" })
    if (args.cursor !== undefined) {
      query.set("cursor", args.cursor)
    }
    const page = await githubAppPage<GitHubDelivery>(
      `/app/hook/deliveries?${query}`
    )
    const now = Date.now()
    let failed = 0
    for (const delivery of failedGitHubDeliveries(page.items, now)) {
      if (
        delivery.installation_id === undefined ||
        delivery.installation_id === null
      ) {
        continue
      }
      const claimed = await ctx.runMutation(
        internal.integrations.github.ingress.recovery.claim,
        {
          eventId: delivery.guid,
          installationId: String(delivery.installation_id),
        }
      )
      if (claimed) {
        try {
          await githubAppRequest(
            `/app/hook/deliveries/${delivery.id}/attempts`,
            {
              method: "POST",
            }
          )
        } catch {
          failed += 1
        }
      }
    }
    const oldest = page.items.at(-1)
    if (
      page.cursor !== null &&
      oldest !== undefined &&
      Date.parse(oldest.delivered_at) > now - recoveryWindowMs
    ) {
      await ctx.scheduler.runAfter(
        1000,
        internal.integrations.github.ingress.recovery.sweep,
        {
          cursor: page.cursor,
        }
      )
    }
    if (failed > 0) {
      throw new Error(`GitHub could not queue ${failed} webhook redeliveries`)
    }
  },
})

export function failedGitHubDeliveries(
  deliveries: GitHubDelivery[],
  now: number
) {
  const successful = new Set(
    deliveries
      .filter((delivery) => isSuccessful(delivery.status_code))
      .map((delivery) => delivery.guid)
  )
  const seen = new Set<string>()
  return deliveries.filter((delivery) => {
    const deliveredAt = Date.parse(delivery.delivered_at)
    if (
      seen.has(delivery.guid) ||
      successful.has(delivery.guid) ||
      !Number.isFinite(deliveredAt) ||
      deliveredAt < now - recoveryWindowMs ||
      deliveredAt > now - 60_000
    ) {
      return false
    }
    seen.add(delivery.guid)
    return true
  })
}

function isSuccessful(status: number | null) {
  return status !== null && status >= 200 && status < 400
}

export const claim = internalMutation({
  args: { eventId: v.string(), installationId: v.string() },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "github",
      externalId: args.installationId,
    })
    if (integration === null) {
      return false
    }
    const previous = await ctx.db
      .query("githubRecoveries")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique()
    const now = Date.now()
    if (previous !== null) {
      const backoff = Math.min(
        6 * 60 * 60 * 1000,
        retryDelayMs * 2 ** Math.min(previous.attempts - 1, 6)
      )
      if (previous.requestedAt + backoff > now) {
        return false
      }
      await ctx.db.patch(previous._id, {
        attempts: previous.attempts + 1,
        requestedAt: now,
      })
    } else {
      await ctx.db.insert("githubRecoveries", {
        eventId: args.eventId,
        attempts: 1,
        requestedAt: now,
      })
    }
    return true
  },
})

export const clean = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("githubRecoveries")
      .withIndex("by_requestedAt", (q) =>
        q.lt("requestedAt", Date.now() - recoveryWindowMs)
      )
      .take(100)
    for (const row of expired) {
      await ctx.db.delete(row._id)
    }
    if (expired.length === 100) {
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.ingress.recovery.clean,
        {}
      )
    }
  },
})

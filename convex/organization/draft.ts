"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import { type CrawledPage, crawlPage, discoverUrls, hostFromUrl } from "./crawl"
import { extractFacts } from "./extract"

type StepKind = "reading" | "exploring" | "extracting" | "done" | "error"

// Crawls an organization's first-party pages, extracts structured facts with the
// model, and writes a proposed draft for human approval. Progress is streamed to
// the discovery row so the console can show it live.
export const run = internalAction({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.organization.discovery.start, {
      tenantId: args.tenantId,
    })

    try {
      await discover(ctx, args.tenantId)
      await ctx.runMutation(internal.organization.discovery.finish, {
        tenantId: args.tenantId,
      })
    } catch (error) {
      await reportFailure(ctx, args.tenantId, error)
    }
  },
})

async function discover(ctx: ActionCtx, tenantId: string) {
  const primaryUrl = await ctx.runQuery(
    internal.organization.sources.primaryUrl,
    { tenantId }
  )

  if (primaryUrl === null) {
    throw new Error("No website has been set for this organization.")
  }

  const host = hostFromUrl(primaryUrl)

  if (host === null) {
    throw new Error("The organization website is not a valid URL.")
  }

  const pages = await collectPages(ctx, tenantId, primaryUrl, host)

  if (pages.length === 0) {
    throw new Error("Could not read any content from the website.")
  }

  await step(ctx, tenantId, "extracting", "Summarizing what we found")
  const facts = await extractFacts({ primaryUrl, pages })
  await ctx.runMutation(internal.organization.profile.propose, {
    tenantId,
    facts,
  })
  await step(ctx, tenantId, "done", "Draft ready for review")
}

async function collectPages(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  host: string
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = []
  await step(ctx, tenantId, "reading", `Reading ${host}`, primaryUrl)
  const primary = await crawlPage(primaryUrl)

  if (primary !== null) {
    pages.push(primary)
    await baseline(ctx, tenantId, primary, true)
  }

  for (const url of await discoverUrls(host, primaryUrl)) {
    await step(ctx, tenantId, "exploring", `Exploring ${shortPath(url)}`, url)
    const page = await crawlPage(url)

    if (page !== null) {
      pages.push(page)
      await baseline(ctx, tenantId, page, false)
    }
  }

  return pages
}

async function baseline(
  ctx: ActionCtx,
  tenantId: string,
  page: CrawledPage,
  primary: boolean
) {
  await ctx.runMutation(internal.organization.sources.upsert, {
    tenantId,
    url: page.url,
    hash: page.hash,
    primary,
  })
}

async function step(
  ctx: ActionCtx,
  tenantId: string,
  kind: StepKind,
  label: string,
  url?: string
) {
  await ctx.runMutation(internal.organization.discovery.step, {
    tenantId,
    kind,
    label,
    ...(url === undefined ? {} : { url }),
  })
}

async function reportFailure(ctx: ActionCtx, tenantId: string, error: unknown) {
  await ctx.runMutation(internal.organization.discovery.finish, {
    tenantId,
    error: error instanceof Error ? error.message : "Discovery failed.",
  })
}

function shortPath(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === "/" ? "" : parsed.pathname

    return `${parsed.hostname.replace(/^www\./, "")}${path}`
  } catch {
    return url
  }
}

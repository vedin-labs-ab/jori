"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import {
  type CrawledPage,
  candidateLinks,
  crawlPage,
  hostFromUrl,
} from "./crawl"
import { extractFacts } from "./extract"
import { missingFacts } from "./facts"
import { selectLinks } from "./select"
import { type SourceSnapshot } from "./sources"

const initialPages = 5
const followUpPages = 3

type StepKind = "reading" | "exploring" | "extracting" | "done" | "error"

// Crawls an organization's first-party pages, extracts structured facts with the
// model, and writes a proposed draft for human approval. The model decides which
// links to read from the homepage, and gets one targeted follow-up round if a
// key fact is still missing. Progress is streamed to the discovery row so the
// console can show it live.
export const run = internalAction({
  args: { tenantId: v.string(), primaryUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.organization.discovery.start, {
      tenantId: args.tenantId,
    })

    try {
      await discover(ctx, args.tenantId, args.primaryUrl)
      await ctx.runMutation(internal.organization.discovery.finish, {
        tenantId: args.tenantId,
      })
    } catch (error) {
      await reportFailure(ctx, args.tenantId, error)
    }
  },
})

async function discover(ctx: ActionCtx, tenantId: string, primaryUrl: string) {
  const host = hostFromUrl(primaryUrl)

  if (host === null) {
    throw new Error("The organization website is not a valid URL.")
  }

  await step(ctx, tenantId, "reading", `Reading ${host}`, primaryUrl)
  const home = await crawlPage(primaryUrl)

  if (home === null) {
    throw new Error("Could not read any content from the website.")
  }

  let pages = await explore(ctx, tenantId, {
    host,
    primaryUrl,
    pages: [home],
    limit: initialPages,
    missing: [],
  })

  await step(ctx, tenantId, "extracting", "Summarizing what we found")
  let facts = await extractFacts({ primaryUrl, pages: extractionPages(pages) })

  const missing = missingFacts(facts)

  if (missing.length > 0) {
    pages = await explore(ctx, tenantId, {
      host,
      primaryUrl,
      pages,
      limit: followUpPages,
      missing,
    })
    facts = await extractFacts({ primaryUrl, pages: extractionPages(pages) })
  }

  await ctx.runMutation(internal.organization.profile.propose, {
    tenantId,
    facts,
    sources: pages.map(toSource),
    website: primaryUrl,
  })
  await step(ctx, tenantId, "done", "Draft ready for review")
}

// One navigation round: the model picks links to read from those discovered so
// far, and we fetch them. Returns the page set extended with whatever was read.
async function explore(
  ctx: ActionCtx,
  tenantId: string,
  args: {
    host: string
    primaryUrl: string
    pages: CrawledPage[]
    limit: number
    missing: string[]
  }
): Promise<CrawledPage[]> {
  const chosen = await selectLinks({
    primaryUrl: args.primaryUrl,
    candidates: candidateLinks(args.host, args.pages),
    limit: args.limit,
    missing: args.missing,
  })

  const pages = [...args.pages]

  for (const url of chosen) {
    await step(ctx, tenantId, "exploring", `Exploring ${shortPath(url)}`, url)
    const page = await crawlPage(url)

    if (page !== null) {
      pages.push(page)
    }
  }

  return pages
}

function extractionPages(pages: CrawledPage[]) {
  return pages.map((page) => ({ url: page.url, text: page.text }))
}

function toSource(page: CrawledPage, index: number): SourceSnapshot {
  return { url: page.url, hash: page.hash, primary: index === 0 }
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

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
import { missingFacts, type OrganizationFacts } from "./facts"
import { selectLinks } from "./select"
import { type SourceSnapshot } from "./sources"

const initialPages = 5
const followUpPages = 3

type StepKind = "page" | "summary"

type DraftResult = {
  facts: OrganizationFacts
  startedAt: number
}

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

  const home = await crawl(ctx, tenantId, `Reading ${host}`, primaryUrl)

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

  const firstDraft = await extractDraft(ctx, tenantId, primaryUrl, pages)

  const missing = missingFacts(firstDraft.facts)

  if (missing.length > 0) {
    await completeStep(ctx, tenantId, firstDraft.startedAt)
    pages = await explore(ctx, tenantId, {
      host,
      primaryUrl,
      pages,
      limit: followUpPages,
      missing,
    })

    const finalDraft = await extractDraft(ctx, tenantId, primaryUrl, pages)
    await proposeDraft(ctx, tenantId, primaryUrl, pages, finalDraft)

    return
  }

  await proposeDraft(ctx, tenantId, primaryUrl, pages, firstDraft)
}

async function proposeDraft(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  pages: CrawledPage[],
  draft: DraftResult
) {
  try {
    await writeDraft(ctx, tenantId, primaryUrl, pages, draft.facts)
    await completeStep(ctx, tenantId, draft.startedAt)
  } catch (error) {
    await completeStep(ctx, tenantId, draft.startedAt, messageFrom(error))
    throw error
  }
}

async function writeDraft(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  pages: CrawledPage[],
  facts: OrganizationFacts
) {
  await ctx.runMutation(internal.organization.profile.propose, {
    tenantId,
    facts,
    sources: pages.map(toSource),
    website: primaryUrl,
  })
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
    const page = await crawl(ctx, tenantId, `Exploring ${shortPath(url)}`, url)

    if (page !== null) {
      pages.push(page)
    }
  }

  return pages
}

async function crawl(
  ctx: ActionCtx,
  tenantId: string,
  label: string,
  url: string
) {
  const startedAt = await startStep(ctx, tenantId, "page", label, url)

  try {
    const page = await crawlPage(url)

    if (page !== null) {
      await completeStep(ctx, tenantId, startedAt)
      return page
    }
  } catch {
    // Page failures are recorded here; callers decide whether to keep going.
  }

  await completeStep(
    ctx,
    tenantId,
    startedAt,
    `Could not read ${shortPath(url)}`
  )

  return null
}

async function extractDraft(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  pages: CrawledPage[]
): Promise<DraftResult> {
  const startedAt = await startStep(
    ctx,
    tenantId,
    "summary",
    "Drafting profile"
  )

  try {
    return {
      facts: await extractFacts({ primaryUrl, pages: extractionPages(pages) }),
      startedAt,
    }
  } catch (error) {
    await completeStep(ctx, tenantId, startedAt, messageFrom(error))
    throw error
  }
}

function extractionPages(pages: CrawledPage[]) {
  return pages.map((page) => ({ url: page.url, text: page.text }))
}

function toSource(page: CrawledPage, index: number): SourceSnapshot {
  return { url: page.url, hash: page.hash, primary: index === 0 }
}

async function startStep(
  ctx: ActionCtx,
  tenantId: string,
  kind: StepKind,
  label: string,
  url?: string
) {
  const startedAt: number = await ctx.runMutation(
    internal.organization.discovery.startStep,
    {
      tenantId,
      kind,
      label,
      ...(url === undefined ? {} : { url }),
    }
  )

  return startedAt
}

async function completeStep(
  ctx: ActionCtx,
  tenantId: string,
  startedAt: number,
  error?: string
) {
  await ctx.runMutation(internal.organization.discovery.completeStep, {
    tenantId,
    startedAt,
    ...(error === undefined ? {} : { error }),
  })
}

async function reportFailure(ctx: ActionCtx, tenantId: string, error: unknown) {
  await ctx.runMutation(internal.organization.discovery.finish, {
    tenantId,
    error: messageFrom(error),
  })
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Discovery failed."
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

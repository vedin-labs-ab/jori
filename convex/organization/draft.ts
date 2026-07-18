"use node"

import { randomUUID } from "node:crypto"
import { v } from "convex/values"
import { compactRecord } from "../../contracts/json"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import {
  type CrawledPage,
  candidateLinks,
  crawlPage,
  hostFromUrl,
} from "./crawl"
import { extractFacts } from "./extract"
import { type OrganizationFacts } from "./facts"
import { selectLinks } from "./select"
import { type SourceSnapshot } from "./sources"

const maxPages = 7

type StepKind = "page" | "summary"

type DraftResult = {
  facts: OrganizationFacts
  stepId: string
}

type QueuedCrawl = {
  stepId: string
  url: string
}

// Crawls an organization's first-party pages, extracts structured facts with the
// model, and writes a proposed draft for human approval. The model decides which
// links to read from the homepage. Progress is streamed to the discovery row so
// the console can show it live.
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

  const pages = [home]
  const chosen = await selectLinks({
    primaryUrl,
    candidates: candidateLinks(host, pages),
    limit: maxPages,
  })
  const queued = await queueCrawls(ctx, tenantId, chosen)

  for (const queuedCrawl of queued) {
    const page = await crawlQueued(ctx, tenantId, queuedCrawl)

    if (page !== null) {
      pages.push(page)
    }
  }

  const draft = await extractDraft(ctx, tenantId, primaryUrl, pages)
  await proposeDraft(ctx, tenantId, primaryUrl, pages, draft)
}

async function proposeDraft(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  pages: CrawledPage[],
  draft: DraftResult
) {
  const sources = pages.map(toSource)

  try {
    await ctx.runMutation(internal.organization.profile.propose, {
      tenantId,
      facts: draft.facts,
      sources,
      website: primaryUrl,
    })
    // Re-baseline the watcher's fingerprints only after the draft landed; on
    // failure the stale hashes make a later sweep retry the whole draft.
    await ctx.runMutation(internal.organization.sources.baseline, {
      tenantId,
      sources,
    })
    await completeStep(ctx, tenantId, draft.stepId)
  } catch (error) {
    await completeStep(ctx, tenantId, draft.stepId, messageFrom(error))
    throw error
  }
}

async function crawl(
  ctx: ActionCtx,
  tenantId: string,
  label: string,
  url: string
) {
  const stepId = await startStep(ctx, tenantId, "page", label, url)

  return await crawlStep(ctx, tenantId, stepId, url)
}

async function queueCrawls(ctx: ActionCtx, tenantId: string, urls: string[]) {
  const queued: QueuedCrawl[] = []

  for (const url of urls) {
    const stepId = await queueStep(
      ctx,
      tenantId,
      "page",
      `Exploring ${shortPath(url)}`,
      url
    )

    queued.push({ stepId, url })
  }

  return queued
}

async function crawlQueued(
  ctx: ActionCtx,
  tenantId: string,
  queued: QueuedCrawl
) {
  await activateStep(ctx, tenantId, queued.stepId)

  return await crawlStep(ctx, tenantId, queued.stepId, queued.url)
}

// Fetches one page for an open step and completes the step either way; page
// failures are recorded on the step, and callers decide whether to keep going.
async function crawlStep(
  ctx: ActionCtx,
  tenantId: string,
  stepId: string,
  url: string
) {
  try {
    const page = await crawlPage(url)

    if (page !== null) {
      await completeStep(ctx, tenantId, stepId)
      return page
    }
  } catch {
    // Fall through to record the failure on the step.
  }

  await completeStep(ctx, tenantId, stepId, `Could not read ${shortPath(url)}`)

  return null
}

async function extractDraft(
  ctx: ActionCtx,
  tenantId: string,
  primaryUrl: string,
  pages: CrawledPage[]
): Promise<DraftResult> {
  const stepId = await startStep(ctx, tenantId, "summary", "Drafting profile")

  try {
    return {
      facts: await extractFacts({ primaryUrl, pages: extractionPages(pages) }),
      stepId,
    }
  } catch (error) {
    await completeStep(ctx, tenantId, stepId, messageFrom(error))
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
  const stepId = randomUUID()

  await ctx.runMutation(
    internal.organization.discovery.startStep,
    compactRecord({ id: stepId, tenantId, kind, label, url })
  )

  return stepId
}

async function queueStep(
  ctx: ActionCtx,
  tenantId: string,
  kind: StepKind,
  label: string,
  url?: string
) {
  const stepId = randomUUID()

  await ctx.runMutation(
    internal.organization.discovery.queueStep,
    compactRecord({ id: stepId, tenantId, kind, label, url })
  )

  return stepId
}

async function activateStep(ctx: ActionCtx, tenantId: string, stepId: string) {
  await ctx.runMutation(internal.organization.discovery.activateStep, {
    tenantId,
    id: stepId,
  })
}

async function completeStep(
  ctx: ActionCtx,
  tenantId: string,
  stepId: string,
  error?: string
) {
  await ctx.runMutation(
    internal.organization.discovery.completeStep,
    compactRecord({ tenantId, id: stepId, error })
  )
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

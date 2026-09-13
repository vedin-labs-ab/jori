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
import { selectLinks } from "./select"

const maxPages = 7

type StepKind = "page" | "summary"

type Discovery = {
  ctx: ActionCtx
  organizationId: string
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
  args: { organizationId: v.string(), primaryUrl: v.string() },
  handler: async (ctx, args) => {
    const discovery = { ctx, organizationId: args.organizationId }

    await ctx.runMutation(internal.organization.discovery.start, {
      organizationId: args.organizationId,
    })

    try {
      await discover(discovery, args.primaryUrl)
      await ctx.runMutation(internal.organization.discovery.finish, {
        organizationId: args.organizationId,
      })
    } catch (error) {
      await reportFailure(discovery, error)
    }
  },
})

async function discover(discovery: Discovery, primaryUrl: string) {
  const host = hostFromUrl(primaryUrl)

  if (host === null) {
    throw new Error("The organization website is not a valid URL.")
  }

  const home = await crawl(discovery, `Reading ${host}`, primaryUrl)

  if (home === null) {
    throw new Error("Could not read any content from the website.")
  }

  const pages = [home]
  const chosen = await selectLinks({
    primaryUrl,
    candidates: candidateLinks(host, pages),
    limit: maxPages,
  })
  const queued = await queueCrawls(discovery, chosen)

  for (const queuedCrawl of queued) {
    const page = await crawlQueued(discovery, queuedCrawl)

    if (page !== null) {
      pages.push(page)
    }
  }

  await proposeDraft(discovery, primaryUrl, pages)
}

async function proposeDraft(
  discovery: Discovery,
  primaryUrl: string,
  pages: CrawledPage[]
) {
  const stepId = await startStep(discovery, "summary", "Drafting profile")

  try {
    const facts = await extractFacts({
      primaryUrl,
      pages: pages.map(({ url, text }) => ({ url, text })),
    })
    const sources = pages.map(({ url, hash }, index) => ({
      url,
      hash,
      primary: index === 0,
    }))

    await discovery.ctx.runMutation(internal.organization.profile.propose, {
      organizationId: discovery.organizationId,
      facts,
      sources,
      website: primaryUrl,
    })
    // Re-baseline the watcher's fingerprints only after the draft landed; on
    // failure the stale hashes make a later sweep retry the whole draft.
    await discovery.ctx.runMutation(internal.organization.sources.baseline, {
      organizationId: discovery.organizationId,
      sources,
    })
    await completeStep(discovery, stepId)
  } catch (error) {
    await completeStep(discovery, stepId, messageFrom(error))
    throw error
  }
}

async function crawl(discovery: Discovery, label: string, url: string) {
  const stepId = await startStep(discovery, "page", label, url)

  return await crawlStep(discovery, stepId, url)
}

async function queueCrawls(discovery: Discovery, urls: string[]) {
  const queued: QueuedCrawl[] = []

  for (const url of urls) {
    const stepId = await queueStep(
      discovery,
      "page",
      `Exploring ${shortPath(url)}`,
      url
    )

    queued.push({ stepId, url })
  }

  return queued
}

async function crawlQueued(discovery: Discovery, queued: QueuedCrawl) {
  await activateStep(discovery, queued.stepId)

  return await crawlStep(discovery, queued.stepId, queued.url)
}

// Fetches one page for an open step and completes the step either way; page
// failures are recorded on the step, and callers decide whether to keep going.
async function crawlStep(discovery: Discovery, stepId: string, url: string) {
  try {
    const page = await crawlPage(url)

    if (page !== null) {
      await completeStep(discovery, stepId)
      return page
    }
  } catch {
    // Fall through to record the failure on the step.
  }

  await completeStep(discovery, stepId, `Could not read ${shortPath(url)}`)

  return null
}

async function startStep(
  discovery: Discovery,
  kind: StepKind,
  label: string,
  url?: string
) {
  const stepId = randomUUID()

  await discovery.ctx.runMutation(
    internal.organization.discovery.startStep,
    compactRecord({
      id: stepId,
      organizationId: discovery.organizationId,
      kind,
      label,
      url,
    })
  )

  return stepId
}

async function queueStep(
  discovery: Discovery,
  kind: StepKind,
  label: string,
  url?: string
) {
  const stepId = randomUUID()

  await discovery.ctx.runMutation(
    internal.organization.discovery.queueStep,
    compactRecord({
      id: stepId,
      organizationId: discovery.organizationId,
      kind,
      label,
      url,
    })
  )

  return stepId
}

async function activateStep(discovery: Discovery, stepId: string) {
  await discovery.ctx.runMutation(
    internal.organization.discovery.activateStep,
    {
      organizationId: discovery.organizationId,
      id: stepId,
    }
  )
}

async function completeStep(
  discovery: Discovery,
  stepId: string,
  error?: string
) {
  await discovery.ctx.runMutation(
    internal.organization.discovery.completeStep,
    compactRecord({
      organizationId: discovery.organizationId,
      id: stepId,
      error,
    })
  )
}

async function reportFailure(discovery: Discovery, error: unknown) {
  await discovery.ctx.runMutation(internal.organization.discovery.finish, {
    organizationId: discovery.organizationId,
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

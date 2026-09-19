import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"
import {
  type Candidate,
  type Hit,
  type SearchResponse,
} from "../../contracts/discovery"
import { excerpt } from "../../contracts/discovery/excerpt"
import { candidate } from "../../contracts/discovery/validators"
import { components, internal } from "../_generated/api"
import {
  action,
  internalQuery,
  type QueryCtx,
  query,
} from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { resolveCurrentPerson } from "../persons/account"
import { createSight, type Sight } from "../visibility/sight"
import { folderGate } from "../visibility/target"
import { loadPersonTeamIds } from "../visibility/viewer"
import { type Viewer } from "./provider/query"
import { collect } from "./retrieval"
import { project } from "./source"
import { unpack } from "./source/cache"
import { chunks } from "./source/text"
import { findSource } from "./sync/intent"

const limiter = new RateLimiter(components.rateLimiter, {
  search: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 15 },
})
export const scope = internalQuery({
  args: { organizationId: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ viewer?: Viewer; allowed: boolean }> => {
    if (!(await checkOrganizationAccess(ctx, args.organizationId)).ok) {
      return { allowed: false }
    }
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const sight = createSight(ctx, { ...args, personId })
    const pending = await ctx.db
      .query("discoverySources")
      .withIndex("by_organizationId_and_pending", (q) =>
        q.eq("organizationId", args.organizationId).eq("pending", true)
      )
      .first()
    // During synchronization stale grants must never exclude newly visible work.
    if (pending) {
      return { allowed: true }
    }
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_organization_and_parent", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(1001)
    if (folders.length > 1000) {
      return { allowed: true }
    }
    const open = ["root"]
    for (const folder of folders) {
      if (await sight.canShare(folderGate(folder))) {
        open.push(folder._id)
      }
    }
    const teams = await loadPersonTeamIds(ctx, { ...args, personId })
    return {
      allowed: true,
      viewer: {
        owner: `owner:${personId}`,
        tokens: [
          "org",
          `person:${personId}`,
          ...[...teams].map((id) => `team:${id}`),
        ],
        folders: open,
      },
    }
  },
})
/** A small reactive query per eight candidates. Source excerpts are rebuilt
 * only after current access and revision checks; vendor text never reaches UI. */
export const visible = query({
  args: {
    organizationId: v.string(),
    text: v.string(),
    candidates: v.array(candidate),
  },
  handler: async (ctx, args): Promise<Hit[]> => {
    if (
      args.candidates.length > 8 ||
      args.text.length > 200 ||
      !(await checkOrganizationAccess(ctx, args.organizationId)).ok
    ) {
      return []
    }
    const personId = await resolveCurrentPerson(ctx, args.organizationId),
      sight = createSight(ctx, {
        organizationId: args.organizationId,
        personId,
      })
    const hits: Hit[] = []
    for (const candidate of args.candidates) {
      const hit = await visibleHit(ctx, sight, candidate, args.text)
      if (hit) {
        hits.push(hit)
      }
    }
    return hits
  },
})
export const search = action({
  args: { organizationId: v.string(), text: v.string() },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const empty = { candidates: [], partial: false, unavailable: false }
    const text = args.text.trim().slice(0, 200)
    if (!text) {
      return empty
    }
    const access = await checkOrganizationAccess(ctx, args.organizationId)
    if (!access.ok) {
      return empty
    }
    const identity = await ctx.auth.getUserIdentity()
    if (
      !(
        await limiter.limit(ctx, "search", {
          key: `${args.organizationId}:${identity?.tokenIdentifier}`,
        })
      ).ok
    ) {
      return { ...empty, unavailable: true }
    }
    const scope = await ctx.runQuery(internal.discovery.console.scope, {
      organizationId: args.organizationId,
    })
    if (!scope.allowed) {
      return empty
    }
    return collect(ctx, args.organizationId, text, scope.viewer)
  },
})

async function visibleHit(
  ctx: QueryCtx,
  sight: Sight,
  candidate: Candidate,
  text: string
): Promise<Hit | null> {
  if (!Number.isInteger(candidate.part) || candidate.part < 0) {
    return null
  }
  const state = await findSource(ctx, candidate.key)
  if (
    state?.organizationId !== sight.organizationId ||
    state.revision !== candidate.revision
  ) {
    return null
  }
  const source = await project(ctx, candidate.key, sight)
  if (
    !source ||
    source.organizationId !== sight.organizationId ||
    source.revision !== candidate.revision
  ) {
    return null
  }
  const section = source.file
    ? await ctx.db
        .query("discoveryPassages")
        .withIndex("by_key_and_part", (q) =>
          q.eq("key", candidate.key).eq("part", candidate.part)
        )
        .unique()
    : chunks(source.sections)[candidate.part]
  if (!section) {
    return null
  }
  const { snippet, focus } = excerpt(unpack(section.text), text)
  return {
    candidate,
    kind: source.kind,
    resourceId: source.resourceId,
    title: source.title,
    resourceName: source.resourceName,
    snippet,
    location: {
      ...section.location,
      ...(focus
        ? {
            start: (section.location.start ?? 0) + focus.start,
            end: (section.location.start ?? 0) + focus.end,
          }
        : {}),
    },
    ...(state.coverage && state.coverage !== "complete"
      ? { coverage: state.coverage }
      : {}),
  }
}

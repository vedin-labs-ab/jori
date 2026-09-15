import {
  type Candidate,
  type Hit,
  type SearchResponse,
} from "../../contracts/discovery"
import { api } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { retrieve, type Viewer } from "./provider/query"
import { rank } from "./rank"
/** Hydrate the whole bounded retrieval pass before ranking. An exact lexical
 * match must not lose its place merely because semantic fusion ranked it 21st. */
export async function collect(
  ctx: ActionCtx,
  organizationId: string,
  text: string,
  viewer: Viewer | undefined
): Promise<SearchResponse> {
  const seen = new Set<string>(),
    hits: Hit[] = []
  let partial = false
  for (let pass = 0; pass < 3; pass++) {
    const result = await retrieve(organizationId, text, viewer, [...seen])
    partial ||= result.partial
    if (result.unavailable) {
      return {
        candidates: rank(hits, text),
        partial: true,
        unavailable: hits.length === 0,
      }
    }
    const candidates = result.candidates.filter((c) => !seen.has(c.key))
    for (const c of candidates) {
      seen.add(c.key)
    }
    const accepted = await hydrate(ctx, organizationId, text, candidates)
    hits.push(...accepted)
    // Backfill only candidates rejected by current access/revision checks.
    // Fewer relevant matches alone are not a reason to buy another query.
    if (accepted.length === candidates.length) {
      break
    }
    if (rank(hits, text).length >= 20 || !result.more) {
      break
    }
    if (pass === 2) {
      partial = true
    }
  }
  return { candidates: rank(hits, text), partial, unavailable: false }
}

async function hydrate(
  ctx: ActionCtx,
  organizationId: string,
  text: string,
  candidates: Candidate[]
) {
  const hits: Hit[] = []
  for (let offset = 0; offset < candidates.length; offset += 24) {
    const queries = []
    for (let i = offset; i < Math.min(offset + 24, candidates.length); i += 8) {
      queries.push(
        ctx.runQuery(api.discovery.console.visible, {
          organizationId,
          text,
          candidates: candidates.slice(i, i + 8),
        })
      )
    }
    hits.push(...(await Promise.all(queries)).flat())
  }
  return hits
}

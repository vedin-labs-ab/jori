import { v } from "convex/values"
import { shareFragment } from "../../contracts/shares/fragment"
import { bytesToHex } from "../shared/encoding"
import { type RuntimeEnvironment, readOrigin } from "../shared/origin"

// The share mechanism every material domain reuses: a secret-bearing grant
// row minted per link, checked on every anonymous read. Each domain owns
// its share table and queries; only the clearly common pieces live here.

/** Bounds concurrent live links per material; minting past it retires the
 *  oldest while expired links remain available in the console history. */
export const activeShareLimit = 20

/** Grant fields shared by every material share table. Each domain adds its
 *  own material reference column and indexes. */
export const shareFields = {
  organizationId: v.string(),
  createdBy: v.id("persons"),
  secret: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
}

export function randomShareSecret() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

/** The one gate every anonymous share read passes through. Callers resolve
 *  whether the link's creator still has access to the material; everything
 *  else is uniform across domains. */
export function canOpenShare(args: {
  share: { secret: string; expiresAt: number; organizationId: string }
  material: { organizationId: string; archivedAt?: number }
  creatorHasAccess: boolean
  secret: string
  now: number
}) {
  return (
    args.share.secret === args.secret &&
    args.share.expiresAt > args.now &&
    args.share.organizationId === args.material.organizationId &&
    args.material.archivedAt === undefined &&
    args.creatorHasAccess
  )
}

/** When the active set is at capacity, the oldest links make room for the one
 *  about to be minted. Expired links are history and are never retired here. */
export function sharesToRetire<
  Share extends { createdAt: number; expiresAt: number },
>(shares: Share[], now: number) {
  const active = shares
    .filter((share) => share.expiresAt > now)
    .sort((left, right) => left.createdAt - right.createdAt)
  const overflow = Math.max(0, active.length + 1 - activeShareLimit)

  return active.slice(0, overflow)
}

export type MaterialShareLink = {
  url?: string
  urlPath: string
}

export type MintedShare = { url: string; urlPath: string; expiresAt: number }

/** What every mint returns: the shareable link plus its expiry. Without a
 *  configured origin the path (with fragment) stands in for the URL. */
export function mintedShare(
  link: MaterialShareLink,
  expiresAt: number
): MintedShare {
  return { url: link.url ?? link.urlPath, urlPath: link.urlPath, expiresAt }
}

/** The material's console path plus the share secret in the fragment. */
export function shareLink(
  urlPath: string,
  secret: string,
  environment: RuntimeEnvironment = process.env
): MaterialShareLink {
  const fragment = `#${shareFragment(secret)}`
  const origin = readOrigin(environment)
  const path = `${urlPath}${fragment}`

  return origin === undefined
    ? { urlPath: path }
    : {
        url: `${new URL(urlPath, origin).toString()}${fragment}`,
        urlPath: path,
      }
}

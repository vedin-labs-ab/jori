import {
  profileClaimLimit,
  profileMissLimit,
  profileWindowMissMinimum,
} from "./limits"
import { type PlaceClaim, type PlaceSection } from "./schema"

// The model's judgment of one existing claim against a message window. The
// model only classifies; all lifecycle arithmetic stays in code so no pass
// can lose a claim except through an explicit verdict.
export const claimVerdicts = [
  "confirmed",
  "contradicted",
  "revised",
  "unmentioned",
] as const
export type ClaimVerdict = (typeof claimVerdicts)[number]

export type ClaimReview = {
  verdict: ClaimVerdict
  text: string
}

export type ClaimAddition = {
  section: PlaceSection
  text: string
}

export type ProfileReview = {
  reviews: ClaimReview[]
  additions: ClaimAddition[]
}

// Applies one window's review: supported claims refresh, contradicted claims
// drop immediately, unmentioned claims age by one miss when the window was
// big enough to plausibly re-express them, and stale claims expire. Reviews
// align with claims by position; an unreviewed claim counts as unmentioned.
export function applyProfileReview(args: {
  claims: PlaceClaim[]
  review: ProfileReview
  windowSize: number
  now: number
}): PlaceClaim[] {
  const missable = args.windowSize >= profileWindowMissMinimum
  const kept = args.claims.flatMap((claim, index) => {
    const next = reviewedClaim(
      claim,
      args.review.reviews[index],
      missable,
      args.now
    )

    return next === null ? [] : [next]
  })
  const added = args.review.additions.flatMap((addition) => {
    const text = addition.text.trim()

    return text === ""
      ? []
      : [{ section: addition.section, text, confirmedAt: args.now, misses: 0 }]
  })

  return capClaims([...kept, ...added])
}

function reviewedClaim(
  claim: PlaceClaim,
  review: ClaimReview | undefined,
  missable: boolean,
  now: number
): PlaceClaim | null {
  const verdict = review?.verdict ?? "unmentioned"

  if (verdict === "contradicted") {
    return null
  }

  if (verdict === "unmentioned") {
    const misses = claim.misses + (missable ? 1 : 0)

    return misses >= profileMissLimit ? null : { ...claim, misses }
  }

  const revision = verdict === "revised" ? review?.text.trim() : undefined

  return {
    ...claim,
    text: revision === undefined || revision === "" ? claim.text : revision,
    confirmedAt: now,
    misses: 0,
  }
}

// Keeps the profile bounded by evicting the claims furthest from renewal:
// most misses first, then oldest confirmation. Survivors keep their order.
function capClaims(claims: PlaceClaim[]): PlaceClaim[] {
  if (claims.length <= profileClaimLimit) {
    return claims
  }

  const evicted = new Set(
    [...claims]
      .sort(
        (left, right) =>
          right.misses - left.misses || left.confirmedAt - right.confirmedAt
      )
      .slice(0, claims.length - profileClaimLimit)
  )

  return claims.filter((claim) => !evicted.has(claim))
}

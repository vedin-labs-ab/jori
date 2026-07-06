import { expect, test } from "vitest"
import { applyProfileReview, type ProfileReview } from "./claims"
import {
  profileClaimLimit,
  profileMissLimit,
  profileWindowMissMinimum,
} from "./limits"
import { type PlaceClaim, type PlaceSection } from "./schema"

const now = 1_000_000

function claim(text: string, overrides: Partial<PlaceClaim> = {}): PlaceClaim {
  return { section: "purpose", text, confirmedAt: 0, misses: 0, ...overrides }
}

function review(overrides: Partial<ProfileReview> = {}): ProfileReview {
  return { reviews: [], additions: [], ...overrides }
}

test("confirmed and revised claims refresh their lifecycle state", () => {
  const next = applyProfileReview({
    claims: [claim("stays", { misses: 5 }), claim("old wording")],
    review: review({
      reviews: [
        { verdict: "confirmed", text: "" },
        { verdict: "revised", text: "new wording" },
      ],
    }),
    windowSize: profileWindowMissMinimum,
    now,
  })

  expect(next).toEqual([
    claim("stays", { confirmedAt: now }),
    claim("new wording", { confirmedAt: now }),
  ])
})

test("contradicted claims drop immediately", () => {
  const next = applyProfileReview({
    claims: [claim("gone"), claim("stays")],
    review: review({
      reviews: [
        { verdict: "contradicted", text: "" },
        { verdict: "confirmed", text: "" },
      ],
    }),
    windowSize: profileWindowMissMinimum,
    now,
  })

  expect(next.map((entry) => entry.text)).toEqual(["stays"])
})

test("unmentioned claims age only in windows large enough to speak", () => {
  const claims = [claim("quiet")]

  const small = applyProfileReview({
    claims,
    review: review(),
    windowSize: profileWindowMissMinimum - 1,
    now,
  })
  const large = applyProfileReview({
    claims,
    review: review(),
    windowSize: profileWindowMissMinimum,
    now,
  })

  expect(small[0]?.misses).toBe(0)
  expect(large[0]?.misses).toBe(1)
})

test("claims expire after the miss limit and revision text falls back", () => {
  const next = applyProfileReview({
    claims: [
      claim("expired", { misses: profileMissLimit - 1 }),
      claim("kept wording"),
    ],
    review: review({
      reviews: [
        { verdict: "unmentioned", text: "" },
        { verdict: "revised", text: "  " },
      ],
    }),
    windowSize: profileWindowMissMinimum,
    now,
  })

  expect(next).toEqual([claim("kept wording", { confirmedAt: now })])
})

test("additions land trimmed and blank additions are ignored", () => {
  const next = applyProfileReview({
    claims: [],
    review: review({
      additions: [
        { section: "rhythm" as PlaceSection, text: " standups daily " },
        { section: "people" as PlaceSection, text: "   " },
      ],
    }),
    windowSize: 0,
    now,
  })

  expect(next).toEqual([
    { section: "rhythm", text: "standups daily", confirmedAt: now, misses: 0 },
  ])
})

test("overflow evicts the claims furthest from renewal, keeping order", () => {
  const claims = [
    claim("worst", { misses: 9 }),
    ...Array.from({ length: profileClaimLimit }, (_, index) =>
      claim(`claim ${index}`, { confirmedAt: index + 1 })
    ),
  ]

  const next = applyProfileReview({
    claims,
    review: review({
      reviews: claims.map((_, index) => ({
        verdict:
          index === 0 ? ("unmentioned" as const) : ("confirmed" as const),
        text: "",
      })),
    }),
    windowSize: profileWindowMissMinimum,
    now,
  })

  expect(next).toHaveLength(profileClaimLimit)
  expect(next.map((entry) => entry.text)).not.toContain("worst")
  expect(next[0]?.text).toBe("claim 0")
})

import { describe, expect, test } from "vitest"
import { citationListSchema, iso, journalRecord, readCitations } from "./judge"

describe("citation wire schema", () => {
  test("lists exactly the citable kinds plus why", () => {
    const schema = citationListSchema(["effort"])

    expect(schema.items.required).toEqual(["effort", "why"])
    expect(Object.keys(schema.items.properties)).toEqual(["effort", "why"])
  })
})

describe("citation reading", () => {
  test("keeps citations naming exactly one allowed kind", () => {
    expect(
      readCitations(
        [
          { event: "e1", conversation: null, why: "shows work" },
          { event: null, conversation: "c1", why: null },
        ],
        ["event", "conversation"]
      )
    ).toEqual([
      { event: "e1", why: "shows work" },
      { conversation: "c1", why: undefined },
    ])
  })

  test("drops malformed, ambiguous, and out-of-stage citations", () => {
    expect(
      readCitations(
        [
          { event: "e1", conversation: "c1", why: null },
          { event: null, conversation: null, why: "nothing" },
          { effort: "f1", why: null },
          "garbage",
        ],
        ["event", "conversation"]
      )
    ).toEqual([])
    expect(readCitations(undefined, ["effort"])).toEqual([])
  })
})

describe("payload formatting", () => {
  test("renders journal records with the date beside the text", () => {
    expect(
      journalRecord({ observedAt: Date.UTC(2026, 5, 23), entry: "Shipped it." })
    ).toEqual({ on: "2026-06-23", entry: "Shipped it." })
  })

  test("iso renders UTC timestamps", () => {
    expect(iso(Date.UTC(2026, 6, 5, 12, 0, 0))).toBe("2026-07-05T12:00:00.000Z")
  })
})

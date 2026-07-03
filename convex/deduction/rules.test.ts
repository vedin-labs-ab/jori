import { describe, expect, test } from "vitest"
import { minSupportDaySpan } from "./limits"
import { type JudgeOp } from "./review/ops"
import {
  type AllowedSources,
  hasConfirmSupport,
  legalStatusTransition,
  maxObservedAt,
  requiresCitations,
  resolveCitations,
  sortOps,
  statusAfterTransition,
} from "./rules"

const allowed: AllowedSources = {
  events: new Map([["e1", { observedAt: 100, integrationId: "slack" }]]),
  conversations: new Map([
    ["c1", { observedAt: 200, integrationId: "linear" }],
  ]),
}

describe("citation resolution", () => {
  test("resolves citations against the pass input set", () => {
    expect(
      resolveCitations([{ event: "e1" }, { conversation: "c1" }], allowed)
    ).toEqual([
      {
        citation: { event: "e1" },
        observedAt: 100,
        integrationId: "slack",
      },
      {
        citation: { conversation: "c1" },
        observedAt: 200,
        integrationId: "linear",
      },
    ])
  })

  test("one unknown id invalidates the whole op", () => {
    expect(
      resolveCitations([{ event: "e1" }, { event: "hallucinated" }], allowed)
    ).toBeNull()
    expect(resolveCitations([{ conversation: "e1" }], allowed)).toBeNull()
  })

  test("empty citations resolve to an empty list", () => {
    expect(resolveCitations([], allowed)).toEqual([])
  })
})

describe("citation requirements", () => {
  test("assertions need citations; status and merge may not", () => {
    expect(requiresCitations(op("create"))).toBe(true)
    expect(requiresCitations(op("update"))).toBe(true)
    expect(requiresCitations(op("journal"))).toBe(true)
    expect(requiresCitations(op("status"))).toBe(false)
    expect(requiresCitations(op("merge"))).toBe(false)
  })
})

describe("status transitions", () => {
  test("legality matrix", () => {
    expect(legalStatusTransition("proposed", "confirm")).toBe(true)
    expect(legalStatusTransition("confirmed", "confirm")).toBe(false)
    expect(legalStatusTransition("proposed", "close")).toBe(true)
    expect(legalStatusTransition("confirmed", "close")).toBe(true)
    expect(legalStatusTransition("closed", "close")).toBe(false)
    expect(legalStatusTransition("proposed", "reject")).toBe(true)
    expect(legalStatusTransition("confirmed", "reject")).toBe(false)
    expect(legalStatusTransition("closed", "reopen")).toBe(true)
    expect(legalStatusTransition("rejected", "reopen")).toBe(false)
  })

  test("resulting statuses", () => {
    expect(statusAfterTransition("confirm")).toBe("confirmed")
    expect(statusAfterTransition("reopen")).toBe("confirmed")
    expect(statusAfterTransition("close")).toBe("closed")
    expect(statusAfterTransition("reject")).toBe("rejected")
  })
})

describe("confirmation support", () => {
  test("two integrations confirm", () => {
    expect(
      hasConfirmSupport([
        { observedAt: 1, integrationId: "slack" },
        { observedAt: 2, integrationId: "linear" },
      ])
    ).toBe(true)
  })

  test("one integration needs a long enough span", () => {
    expect(
      hasConfirmSupport([
        { observedAt: 0, integrationId: "slack" },
        { observedAt: minSupportDaySpan, integrationId: "slack" },
      ])
    ).toBe(true)
    expect(
      hasConfirmSupport([
        { observedAt: 0, integrationId: "slack" },
        { observedAt: minSupportDaySpan - 1, integrationId: "slack" },
      ])
    ).toBe(false)
  })

  test("a single sighting never confirms", () => {
    expect(hasConfirmSupport([{ observedAt: 1, integrationId: "s" }])).toBe(
      false
    )
    expect(hasConfirmSupport([])).toBe(false)
  })
})

describe("op ordering", () => {
  test("creates resolve first, order otherwise preserved", () => {
    const ops = [
      op("journal"),
      op("create"),
      op("merge"),
      op("create"),
      op("status"),
    ]

    expect(sortOps(ops).map((entry) => entry.op)).toEqual([
      "create",
      "create",
      "journal",
      "merge",
      "status",
    ])
  })
})

describe("sighting timestamps", () => {
  test("maxObservedAt over sightings", () => {
    expect(
      maxObservedAt([
        { citation: { event: "e1" }, observedAt: 5, integrationId: "s" },
        { citation: { event: "e2" }, observedAt: 9, integrationId: "s" },
      ])
    ).toBe(9)
    expect(maxObservedAt([])).toBe(0)
  })
})

function op(kind: JudgeOp["op"]): JudgeOp {
  switch (kind) {
    case "create":
      return {
        op: "create",
        tempId: "t",
        name: "n",
        aliases: [],
        brief: "b",
        entry: "e",
        citations: [],
      }
    case "update":
      return { op: "update", beliefId: "b1", citations: [] }
    case "status":
      return { op: "status", beliefId: "b1", to: "confirm", citations: [] }
    case "merge":
      return { op: "merge", beliefId: "b1", into: "b2", citations: [] }
    case "journal":
      return { op: "journal", beliefId: "b1", entry: "e", citations: [] }
  }
}

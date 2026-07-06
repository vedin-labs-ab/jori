import { describe, expect, test } from "vitest"
import { readEffortOps } from "./parse"

describe("effort op reading", () => {
  test("reads well-formed ops and counts malformed ones", () => {
    const { ops, invalid } = readEffortOps({
      mutations: [
        {
          op: "create",
          tempId: "t1",
          name: "Routing cutover",
          summary: "Cut traffic over to the new router.",
          entry: "Cutover PR opened and reviewed.",
          citations: [{ event: "e1", conversation: null, why: "PR opened" }],
        },
        {
          op: "update",
          effortId: "f1",
          name: null,
          summary: "Sharper summary.",
          citations: [],
        },
        { op: "journal", effortId: "f1", entry: "Shipped.", citations: [] },
        { op: "merge", effortId: "f1", into: "f2", citations: [] },
        { op: "create", tempId: "t2", name: "", summary: "s", entry: "e" },
        { op: "unknown" },
        "garbage",
      ],
    })

    expect(ops).toEqual([
      {
        op: "create",
        tempId: "t1",
        name: "Routing cutover",
        summary: "Cut traffic over to the new router.",
        entry: "Cutover PR opened and reviewed.",
        citations: [{ event: "e1", why: "PR opened" }],
      },
      {
        op: "update",
        effortId: "f1",
        name: undefined,
        summary: "Sharper summary.",
        citations: [],
      },
      { op: "journal", effortId: "f1", entry: "Shipped.", citations: [] },
      { op: "merge", effortId: "f1", into: "f2", citations: [] },
    ])
    expect(invalid).toBe(3)
  })

  test("drops effort citations at this stage", () => {
    const { ops } = readEffortOps({
      mutations: [
        {
          op: "journal",
          effortId: "f1",
          entry: "Shipped.",
          citations: [{ effort: "f2", why: "self-reference" }],
        },
      ],
    })

    expect(ops[0]).toMatchObject({ citations: [] })
  })

  test("tolerates a missing mutations array", () => {
    expect(readEffortOps({})).toEqual({ ops: [], invalid: 0 })
  })
})

describe("entry date stripping", () => {
  test("strips leading date prefixes from entries", () => {
    const { ops, invalid } = readEffortOps({
      mutations: [
        {
          op: "journal",
          effortId: "f1",
          entry: "2026-07-03: Shipped the cutover.",
          citations: [],
        },
        {
          op: "journal",
          effortId: "f1",
          entry: "2026-07-04 to 2026-07-05: Iterated on review feedback.",
          citations: [],
        },
        {
          op: "journal",
          effortId: "f1",
          entry: "Deadline moved to 2026-08-01 after review.",
          citations: [],
        },
        { op: "journal", effortId: "f1", entry: "2026-07-03:", citations: [] },
      ],
    })

    expect(ops.map((op) => "entry" in op && op.entry)).toEqual([
      "Shipped the cutover.",
      "Iterated on review feedback.",
      "Deadline moved to 2026-08-01 after review.",
    ])
    expect(invalid).toBe(1)
  })
})

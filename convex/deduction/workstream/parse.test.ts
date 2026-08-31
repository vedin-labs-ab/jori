import { describe, expect, test } from "vitest"
import { workstreamOutputSchema } from "./contract"
import { readWorkstreamOps } from "./parse"

describe("workstream op reading", () => {
  test("reads well-formed ops and counts malformed ones", () => {
    const { ops, invalid } = readWorkstreamOps({
      bodiesOfWork: [{ name: "ignored by the applier", efforts: ["f1"] }],
      mutations: [
        {
          op: "create",
          tempId: "t1",
          name: "Payments revamp",
          aliases: ["payments v2"],
          brief: "Rebuild of the payments flow.",
          parentId: null,
          citations: [{ effort: "f1", why: "constitutes the work" }],
        },
        { op: "assign", effortId: "f2", beliefId: "b1", why: "same flow" },
        { op: "status", beliefId: "b1", to: "confirm", citations: [] },
        { op: "merge", beliefId: "b1", into: "b2", citations: [] },
        { op: "update", beliefId: "", citations: [] },
        { op: "assign", effortId: "f2", beliefId: null },
      ],
    })

    expect(ops).toEqual([
      {
        op: "create",
        tempId: "t1",
        name: "Payments revamp",
        aliases: ["payments v2"],
        brief: "Rebuild of the payments flow.",
        parentId: undefined,
        citations: [{ effort: "f1", why: "constitutes the work" }],
      },
      { op: "assign", effortId: "f2", beliefId: "b1", why: "same flow" },
      { op: "status", beliefId: "b1", to: "confirm", citations: [] },
      { op: "merge", beliefId: "b1", into: "b2", citations: [] },
    ])
    expect(invalid).toBe(2)
  })

  test("drops event and conversation citations at this stage", () => {
    const { ops } = readWorkstreamOps({
      mutations: [
        {
          op: "update",
          beliefId: "b1",
          brief: "New brief.",
          citations: [{ event: "e1", why: "raw source" }, { effort: "f1" }],
        },
      ],
    })

    expect(ops[0]).toMatchObject({ citations: [{ effort: "f1" }] })
  })
})

describe("workstream output schema", () => {
  test("window scope requires mutations only", () => {
    expect(workstreamOutputSchema("window").required).toEqual(["mutations"])
  })

  test("consolidation requires the blind clustering first", () => {
    expect(workstreamOutputSchema("full").required).toEqual([
      "bodiesOfWork",
      "mutations",
    ])
  })
})

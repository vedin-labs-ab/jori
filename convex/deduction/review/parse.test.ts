import { expect, test } from "vitest"
import { readJudgeOps } from "./parse"

test("reads create and update ops and strips nulls", () => {
  const { ops, invalid } = readJudgeOps({
    mutations: [
      {
        op: "create",
        tempId: "t1",
        name: "Payments revamp",
        aliases: ["payments v2"],
        brief: "Rebuilding the payments flow.",
        entry: "Project kicked off with the first PR merged.",
        parentId: null,
        citations: [{ event: "e1", conversation: null, why: "PR merged" }],
      },
      {
        op: "update",
        beliefId: "b1",
        name: null,
        aliases: null,
        brief: "Now includes the billing migration.",
        parentId: null,
        citations: [{ event: null, conversation: "c1", why: null }],
      },
    ],
  })

  expect(invalid).toBe(0)
  expect(ops).toEqual([
    {
      op: "create",
      tempId: "t1",
      name: "Payments revamp",
      aliases: ["payments v2"],
      brief: "Rebuilding the payments flow.",
      entry: "Project kicked off with the first PR merged.",
      citations: [{ event: "e1", why: "PR merged" }],
    },
    {
      op: "update",
      beliefId: "b1",
      brief: "Now includes the billing migration.",
      citations: [{ conversation: "c1" }],
    },
  ])
})

test("reads status, merge, and journal ops", () => {
  const { ops, invalid } = readJudgeOps({
    mutations: [
      { op: "status", beliefId: "b1", to: "confirm", citations: [] },
      { op: "merge", beliefId: "b2", into: "t1", citations: [] },
      { op: "journal", beliefId: "b1", entry: "Slipped.", citations: [] },
    ],
  })

  expect(invalid).toBe(0)
  expect(ops).toEqual([
    { op: "status", beliefId: "b1", to: "confirm", citations: [] },
    { op: "merge", beliefId: "b2", into: "t1", citations: [] },
    { op: "journal", beliefId: "b1", entry: "Slipped.", citations: [] },
  ])
})

test("counts malformed ops instead of throwing", () => {
  const { ops, invalid } = readJudgeOps({
    mutations: [
      { op: "teleport", beliefId: "b1" },
      { op: "create", tempId: "", name: "x", brief: "y", citations: [] },
      { op: "create", tempId: "t", name: "x", brief: "y", citations: [] },
      { op: "status", beliefId: "b1", to: "promote", citations: [] },
      "not an object",
      { op: "journal", beliefId: "b1", entry: "ok", citations: [] },
    ],
  })

  expect(invalid).toBe(5)
  expect(ops).toHaveLength(1)
})

test("drops citations that set both or neither reference", () => {
  const { ops } = readJudgeOps({
    mutations: [
      {
        op: "journal",
        beliefId: "b1",
        entry: "ok",
        citations: [
          { event: "e1", conversation: "c1" },
          { event: null, conversation: null },
          { event: "e2", conversation: null },
        ],
      },
    ],
  })

  expect(ops[0]?.citations).toEqual([{ event: "e2" }])
})

test("tolerates a missing mutations array", () => {
  expect(readJudgeOps({})).toEqual({ ops: [], invalid: 0 })
})

import { describe, expect, test } from "vitest"
import { mergePatch, pathPatch, readPath } from "../../contracts/json"
import { resolveStateWrite } from "./state"

const document = {
  meetings: { "mb:1": { status: "ready" } },
  dispatches: { "morning:2026-07-18": { status: "delivered" } },
}

describe("resolveStateWrite", () => {
  test("replace passes the value through", () => {
    expect(
      resolveStateWrite(document, { type: "replace", value: { fresh: true } })
    ).toEqual({ kind: "write", value: { fresh: true } })
  })

  test("merge patches the current document", () => {
    const resolved = resolveStateWrite(document, {
      type: "merge",
      patch: { meetings: { "mb:1": { status: "stale" } } },
    })

    expect(resolved).toEqual({
      kind: "write",
      value: {
        ...document,
        meetings: { "mb:1": { status: "stale" } },
      },
    })
  })

  test("claim wins when the path is unset and writes only that path", () => {
    const resolved = resolveStateWrite(document, {
      type: "claim",
      path: ["dispatches", "morning:2026-07-19"],
      value: { status: "sending" },
    })

    expect(resolved).toEqual({
      kind: "write",
      value: {
        ...document,
        dispatches: {
          ...document.dispatches,
          "morning:2026-07-19": { status: "sending" },
        },
      },
    })
  })
})

describe("resolveStateWrite claim edges", () => {
  test("claim on an occupied path writes nothing and returns the holder", () => {
    expect(
      resolveStateWrite(document, {
        type: "claim",
        path: ["dispatches", "morning:2026-07-18"],
        value: { status: "sending" },
      })
    ).toEqual({ kind: "held", existing: { status: "delivered" } })
  })

  test("claim works against an empty document", () => {
    expect(
      resolveStateWrite(undefined, {
        type: "claim",
        path: ["dispatches", "first"],
        value: { status: "sending" },
      })
    ).toEqual({
      kind: "write",
      value: { dispatches: { first: { status: "sending" } } },
    })
  })

  test("claim rejects an empty path and a null value", () => {
    expect(() =>
      resolveStateWrite(document, { type: "claim", path: [], value: 1 })
    ).toThrow("non-empty path")
    expect(() =>
      resolveStateWrite(document, {
        type: "claim",
        path: ["dispatches", "key"],
        value: null,
      })
    ).toThrow("non-null value")
  })
})

describe("json path helpers", () => {
  test("readPath walks records and misses cleanly", () => {
    expect(readPath(document, ["meetings", "mb:1", "status"])).toBe("ready")
    expect(readPath(document, ["meetings", "mb:2"])).toBeUndefined()
    expect(readPath("scalar", ["anything"])).toBeUndefined()
  })

  test("pathPatch nests a value under its path", () => {
    expect(pathPatch(["a", "b"], 1)).toEqual({ a: { b: 1 } })
  })

  test("mergePatch merges recursively and deletes on null", () => {
    expect(
      mergePatch(
        { keep: 1, drop: 2, nested: { a: 1 } },
        {
          drop: null,
          nested: { b: 2 },
        }
      )
    ).toEqual({ keep: 1, nested: { a: 1, b: 2 } })
  })
})

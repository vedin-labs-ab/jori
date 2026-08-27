import { describe, expect, test } from "vitest"
import { resolveStoreWrite } from "./write"

const document = {
  meetings: { "mb:1": { status: "ready" } },
  dispatches: { "morning:2026-07-18": { status: "delivered" } },
}

describe("resolveStoreWrite", () => {
  test("replace passes the value through", () => {
    expect(
      resolveStoreWrite(document, { type: "replace", value: { fresh: true } })
    ).toEqual({ kind: "write", value: { fresh: true } })
  })

  test("merge patches the current document", () => {
    expect(
      resolveStoreWrite(document, {
        type: "merge",
        patch: { meetings: { "mb:1": { status: "stale" } } },
      })
    ).toEqual({
      kind: "write",
      value: {
        ...document,
        meetings: { "mb:1": { status: "stale" } },
      },
    })
  })

  test("claim wins when the path is unset and writes only that path", () => {
    expect(
      resolveStoreWrite(document, {
        type: "claim",
        path: ["dispatches", "morning:2026-07-19"],
        value: { status: "sending" },
      })
    ).toEqual({
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

describe("resolveStoreWrite claim edges", () => {
  test("claim on an occupied path writes nothing and returns the holder", () => {
    expect(
      resolveStoreWrite(document, {
        type: "claim",
        path: ["dispatches", "morning:2026-07-18"],
        value: { status: "sending" },
      })
    ).toEqual({ kind: "held", existing: { status: "delivered" } })
  })

  test("claim works against an empty document", () => {
    expect(
      resolveStoreWrite(undefined, {
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
      resolveStoreWrite(document, { type: "claim", path: [], value: 1 })
    ).toThrow("non-empty path")
    expect(() =>
      resolveStoreWrite(document, {
        type: "claim",
        path: ["dispatches", "key"],
        value: null,
      })
    ).toThrow("non-null value")
  })
})

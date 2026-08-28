import { describe, expect, test } from "vitest"
import { resolveDocumentWrite } from "./write"

const document = {
  meetings: { "mb:1": { status: "ready" } },
  dispatches: { "morning:2026-07-18": { status: "delivered" } },
}

describe("resolveDocumentWrite", () => {
  test("replace passes the value through", () => {
    expect(
      resolveDocumentWrite(document, {
        type: "replace",
        value: { fresh: true },
      })
    ).toEqual({ kind: "write", value: { fresh: true } })
  })

  test("merge patches the current document", () => {
    expect(
      resolveDocumentWrite(document, {
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
      resolveDocumentWrite(document, {
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

describe("resolveDocumentWrite claim edges", () => {
  test("claim on an occupied path writes nothing and returns the holder", () => {
    expect(
      resolveDocumentWrite(document, {
        type: "claim",
        path: ["dispatches", "morning:2026-07-18"],
        value: { status: "sending" },
      })
    ).toEqual({ kind: "held", existing: { status: "delivered" } })
  })

  test("claim works against an empty document", () => {
    expect(
      resolveDocumentWrite(undefined, {
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
      resolveDocumentWrite(document, { type: "claim", path: [], value: 1 })
    ).toThrow("non-empty path")
    expect(() =>
      resolveDocumentWrite(document, {
        type: "claim",
        path: ["dispatches", "key"],
        value: null,
      })
    ).toThrow("non-null value")
  })
})

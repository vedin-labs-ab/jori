import { describe, expect, test } from "vitest"
import { applyHunks, isEnvelopePatch } from "./envelope"
import { parseEnvelopePatch } from "./parse"

describe("envelope detection", () => {
  test("recognizes the envelope and leaves diffs alone", () => {
    expect(isEnvelopePatch("*** Begin Patch\n*** End Patch")).toBe(true)
    expect(isEnvelopePatch("  \n*** Begin Patch")).toBe(true)
    expect(isEnvelopePatch("--- a/file\n+++ b/file")).toBe(false)
  })
})

describe("envelope parsing", () => {
  test("parses add, update, and delete operations", () => {
    const operations = parseEnvelopePatch(
      [
        "*** Begin Patch",
        "*** Add File: src/new.ts",
        "+hello",
        "+world",
        "*** Update File: src/app.ts",
        "@@ function main()",
        " keep",
        "-old",
        "+new",
        "*** Delete File: src/gone.ts",
        "*** End Patch",
      ].join("\n")
    )

    expect(operations).toEqual([
      { kind: "add", path: "src/new.ts", content: "hello\nworld\n" },
      {
        kind: "update",
        path: "src/app.ts",
        moveTo: undefined,
        hunks: [
          {
            anchor: "function main()",
            lines: [
              { kind: "context", text: "keep" },
              { kind: "remove", text: "old" },
              { kind: "add", text: "new" },
            ],
          },
        ],
      },
      { kind: "delete", path: "src/gone.ts" },
    ])
  })

  test("parses a move and tolerates end-of-file markers", () => {
    const [operation] = parseEnvelopePatch(
      [
        "*** Begin Patch",
        "*** Update File: src/a.ts",
        "*** Move to: src/b.ts",
        "-x",
        "+y",
        "*** End of File",
        "*** End Patch",
      ].join("\n")
    )

    expect(operation).toMatchObject({ path: "src/a.ts", moveTo: "src/b.ts" })
  })
})

describe("envelope validation", () => {
  test("rejects malformed patches", () => {
    expect(() => parseEnvelopePatch("*** Begin Patch\n*** End Patch")).toThrow(
      "no file operations"
    )
    expect(() =>
      parseEnvelopePatch("*** Begin Patch\nrandom line\n*** End Patch")
    ).toThrow("Unrecognized patch line")
    expect(() =>
      parseEnvelopePatch(
        "*** Begin Patch\n*** Add File: a.ts\nno prefix\n*** End Patch"
      )
    ).toThrow('start with "+"')
  })
})

describe("hunk application", () => {
  test("replaces context-anchored spans in order", () => {
    const content = ["one", "two", "three", "two"].join("\n")
    const next = applyHunks(
      content,
      [
        {
          anchor: null,
          lines: [
            { kind: "remove", text: "two" },
            { kind: "add", text: "TWO" },
          ],
        },
        {
          anchor: null,
          lines: [
            { kind: "remove", text: "two" },
            { kind: "add", text: "2" },
          ],
        },
      ],
      "app.ts"
    )

    expect(next).toBe(["one", "TWO", "three", "2"].join("\n"))
  })

  test("falls back to whitespace-lenient matching", () => {
    const next = applyHunks(
      "  indented  ",
      [
        {
          anchor: null,
          lines: [
            { kind: "remove", text: "  indented" },
            { kind: "add", text: "replaced" },
          ],
        },
      ],
      "app.ts"
    )

    expect(next).toBe("replaced")
  })

  test("throws when the context cannot be found", () => {
    expect(() =>
      applyHunks(
        "actual",
        [{ anchor: null, lines: [{ kind: "remove", text: "missing" }] }],
        "app.ts"
      )
    ).toThrow("Hunk context not found in app.ts")
  })
})

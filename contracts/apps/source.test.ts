import { describe, expect, test } from "vitest"
import { maxAppFileBytes, maxAppFiles, normalizeAppSourceFiles } from "./source"

describe("app source normalization", () => {
  test("normalizes, sorts, and measures source files", () => {
    expect(
      normalizeAppSourceFiles([
        {
          path: " src/contract.ts ",
          content: "export const contract = {}\n",
          executable: true,
        },
        { path: "src/App.tsx", content: "export default 'å'\n" },
      ])
    ).toEqual([
      {
        path: "src/App.tsx",
        content: "export default 'å'\n",
        executable: false,
        byteSize: 20,
      },
      {
        path: "src/contract.ts",
        content: "export const contract = {}\n",
        executable: true,
        byteSize: 27,
      },
    ])
  })

  test.each([
    [undefined, "App source must include files."],
    [[], "App source must include files."],
    [[null], "App source files must be objects."],
    [[{}], "App source path must be a string."],
    [[{ path: "src/App.tsx" }], "App source file src/App.tsx must be text."],
  ])("rejects malformed source %#", (source, message) => {
    expect(() => normalizeAppSourceFiles(source)).toThrow(message)
  })

  test("rejects duplicate normalized paths", () => {
    expect(() =>
      normalizeAppSourceFiles([
        { path: "src/App.tsx", content: "export {}\n" },
        { path: " src/App.tsx ", content: "export {}\n" },
      ])
    ).toThrow("Duplicate app source path: src/App.tsx")
  })
})

describe("app source validation", () => {
  test("rejects missing, platform-owned, and unsafe source", () => {
    expect(() =>
      normalizeAppSourceFiles([{ path: "src/App.tsx", content: "export {}\n" }])
    ).toThrow("App source is missing src/contract.ts.")
    expect(() =>
      normalizeAppSourceFiles([
        ...minimalSource(),
        { path: "package.json", content: "{}\n" },
      ])
    ).toThrow("App source cannot include platform-owned file: package.json")
    expect(() =>
      normalizeAppSourceFiles([
        { path: "src/App.tsx", content: "fetch('/private')\n" },
        { path: "src/contract.ts", content: "export {}\n" },
      ])
    ).toThrow("uses a forbidden platform API")
  })

  test("enforces source count and file size limits", () => {
    expect(() =>
      normalizeAppSourceFiles(
        Array.from({ length: maxAppFiles + 1 }, (_value, index) => ({
          path: `src/${index}.ts`,
          content: "export {}\n",
        }))
      )
    ).toThrow(`Apps can include at most ${maxAppFiles} files.`)
    expect(() =>
      normalizeAppSourceFiles([
        { path: "src/App.tsx", content: "a".repeat(maxAppFileBytes + 1) },
        { path: "src/contract.ts", content: "export {}\n" },
      ])
    ).toThrow(`exceeds ${maxAppFileBytes} bytes`)
  })
})

function minimalSource() {
  return [
    { path: "src/App.tsx", content: "export {}\n" },
    { path: "src/contract.ts", content: "export {}\n" },
  ]
}

import { describe, expect, test } from "vitest"
import {
  maxArtifactFileBytes,
  maxArtifactFiles,
  normalizeArtifactSourceFiles,
} from "./source"

describe("artifact source normalization", () => {
  test("normalizes, sorts, and measures source files", () => {
    expect(
      normalizeArtifactSourceFiles([
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
    [undefined, "Artifact source must include files."],
    [[], "Artifact source must include files."],
    [[null], "Artifact source files must be objects."],
    [[{}], "Artifact source path must be a string."],
    [
      [{ path: "src/App.tsx" }],
      "Artifact source file src/App.tsx must be text.",
    ],
  ])("rejects malformed source %#", (source, message) => {
    expect(() => normalizeArtifactSourceFiles(source)).toThrow(message)
  })

  test("rejects duplicate normalized paths", () => {
    expect(() =>
      normalizeArtifactSourceFiles([
        { path: "src/App.tsx", content: "export {}\n" },
        { path: " src/App.tsx ", content: "export {}\n" },
      ])
    ).toThrow("Duplicate artifact source path: src/App.tsx")
  })
})

describe("artifact source validation", () => {
  test("rejects missing, platform-owned, and unsafe source", () => {
    expect(() =>
      normalizeArtifactSourceFiles([
        { path: "src/App.tsx", content: "export {}\n" },
      ])
    ).toThrow("Artifact source is missing src/contract.ts.")
    expect(() =>
      normalizeArtifactSourceFiles([
        ...minimalSource(),
        { path: "package.json", content: "{}\n" },
      ])
    ).toThrow(
      "Artifact source cannot include platform-owned file: package.json"
    )
    expect(() =>
      normalizeArtifactSourceFiles([
        { path: "src/App.tsx", content: "fetch('/private')\n" },
        { path: "src/contract.ts", content: "export {}\n" },
      ])
    ).toThrow("uses a forbidden platform API")
  })

  test("enforces source count and file size limits", () => {
    expect(() =>
      normalizeArtifactSourceFiles(
        Array.from({ length: maxArtifactFiles + 1 }, (_value, index) => ({
          path: `src/${index}.ts`,
          content: "export {}\n",
        }))
      )
    ).toThrow(`Artifacts can include at most ${maxArtifactFiles} files.`)
    expect(() =>
      normalizeArtifactSourceFiles([
        { path: "src/App.tsx", content: "a".repeat(maxArtifactFileBytes + 1) },
        { path: "src/contract.ts", content: "export {}\n" },
      ])
    ).toThrow(`exceeds ${maxArtifactFileBytes} bytes`)
  })
})

function minimalSource() {
  return [
    { path: "src/App.tsx", content: "export {}\n" },
    { path: "src/contract.ts", content: "export {}\n" },
  ]
}

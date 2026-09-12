import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, test } from "vitest"

const script = fileURLToPath(new URL("./index.ts", import.meta.url))
const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function check(files: string[], folders: string[] = []) {
  const root = mkdtempSync(path.join(tmpdir(), "jori-structure-"))
  directories.push(root)

  for (const folder of folders) {
    mkdirSync(path.join(root, folder), { recursive: true })
  }
  for (const file of files) {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, "")
  }

  return spawnSync(process.execPath, ["--experimental-strip-types", script], {
    cwd: root,
    encoding: "utf8",
  })
}

test("preserves supporting sources, child folders, conventional names, and skipped paths", () => {
  const result = check([
    "src/domain/index.ts",
    "src/domain/index.test.ts",
    "src/branch/index.ts",
    "src/branch/child/one.ts",
    "src/branch/child/two.ts",
    "src/compiled/index.ts",
    "src/compiled/generated.ts",
    "src/types/index.ts",
    "src/types/types.d.ts",
    "convex/auth.config.ts",
    "convex/schema.ts",
    "src/hooks/use-mobile.ts",
    "src/routeTree.gen.ts",
    "node_modules/bad-dir/bad-file.ts",
    "convex/_generated/bad-file.ts",
    "src/components/ui/bad-name.ts",
    "src/routes/bad-name.ts",
    "bad-name.ts",
    "outside-root/bad-name.ts",
    "outside-root/other.ts",
  ])

  expect(result.status).toBe(0)
  expect(result.stderr).toBe("")
  expect(result.stdout).toBe(
    "Folder structure check passed (10 folders scanned).\n"
  )
})

test("reports invalid empty directories and source names in path order", () => {
  const result = check(
    [
      "src/domain/foo-bar.test.ts",
      "src/domain/other-name.d.ts",
      "scripts/bad-name.config.ts",
      "scripts/index.ts",
    ],
    ["src/z-bad"]
  )

  expect(result.status).toBe(1)
  expect(result.stderr).toBe(
    [
      "Folder structure check failed.",
      "",
      "Default limit: 12 direct source files per folder.",
      "Single-file leaf folders should be flattened into a source file.",
      "Tests, generated files, framework routes, shadcn/ui, and conventional framework files are excluded.",
      "",
      "Compound source names",
      "",
      "- scripts/bad-name.config.ts: `bad-name` is not a single word",
      "- src/domain/foo-bar.test.ts: `foo-bar` is not a single word",
      "- src/domain/other-name.d.ts: `other-name` is not a single word",
      "- src/z-bad: `z-bad` is not a single word",
      "",
      "",
      "Split crowded folders by domain, workflow, or responsibility. Flatten one-file leaf folders until supporting source files exist. Markdown lives in guides, prompts, skills, the legal pages, and the repository root; ask the developer before adding a document.",
      "",
    ].join("\n")
  )
})

test("counts sources outside naming roots and reports crowded folders before leaf folders", () => {
  const result = check([
    ...Array.from({ length: 13 }, (_, index) => `outside-root/file${index}.ts`),
    "src/lonely/index.ts",
  ])

  expect(result.status).toBe(1)
  expect(result.stderr).toContain("Crowded folders\n\n- outside-root: 13/12")
  expect(result.stderr).toContain(
    "Single-file folders\n\n- src/lonely: 1 direct source file"
  )
  expect(result.stderr.indexOf("Crowded folders")).toBeLessThan(
    result.stderr.indexOf("Single-file folders")
  )
  expect(result.stderr).not.toContain("Compound source names")
})

test("a child containing only tests does not exempt a single-file parent", () => {
  const result = check([
    "src/parent/index.ts",
    "src/parent/child/index.test.ts",
  ])

  expect(result.status).toBe(1)
  expect(result.stderr).toContain("- src/parent: 1 direct source file")
})

test("markdown passes in its homes and fails anywhere else", () => {
  const allowed = check([
    "AGENTS.md",
    "README.md",
    "guides/ui.md",
    "prompts/agent/instructions.md",
    "skills/slack/SKILL.md",
    "src/landing/legal/privacy.md",
    "scripts/layout/README.md",
    "node_modules/pkg/README.md",
    "convex/_generated/ai/guidelines.md",
    "src/index.ts",
    "src/index.test.ts",
  ])

  expect(allowed.status).toBe(0)

  const stray = check([
    "src/index.ts",
    "src/index.test.ts",
    "src/NOTES.md",
    "docs/plan.md",
    "guides/deep/page.md",
    "STATUS.md",
  ])

  expect(stray.status).toBe(1)
  expect(stray.stderr).toContain(
    [
      "Markdown outside its homes",
      "",
      "- STATUS.md",
      "- docs/plan.md",
      "- guides/deep/page.md",
      "- src/NOTES.md",
    ].join("\n")
  )
})

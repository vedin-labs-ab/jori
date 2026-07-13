import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { sandboxArtifactRuntime } from "../../contracts/runtime/sandbox"
import { artifactRuntimeFiles, artifactTemplatePath } from "./runtime"

test("artifact runtime files include the template and builder", () => {
  const paths = new Set(artifactRuntimeFiles().map((file) => file.path))

  expect(paths).toContain(`${artifactTemplatePath}/package.json`)
  expect(paths).toContain(`${sandboxArtifactRuntime}/milo-artifact-builder.ts`)
  expect(paths).toContain(`${sandboxArtifactRuntime}/.milo/build-artifact.mjs`)
})

test("artifact-creator skill points at the provisioned template path", () => {
  const skill = readFileSync(
    path.resolve(import.meta.dirname, "../../skills/artifact-creator/SKILL.md"),
    "utf8"
  )

  expect(skill).toContain(artifactTemplatePath)
})

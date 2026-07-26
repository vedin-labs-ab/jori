import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { sandboxAppRuntime } from "../../contracts/runtime/sandbox"
import { appRuntimeFiles, appTemplatePath } from "./apps"

test("app runtime files include the template and builder", () => {
  const paths = new Set(appRuntimeFiles().map((file) => file.path))

  expect(paths).toContain(`${appTemplatePath}/package.json`)
  expect(paths).toContain(`${sandboxAppRuntime}/jori-app-builder.ts`)
  expect(paths).toContain(`${sandboxAppRuntime}/.jori/build-app.mjs`)
})

test("app-creator skill points at the provisioned template path", () => {
  const skill = readFileSync(
    path.resolve(import.meta.dirname, "../../skills/app-creator/SKILL.md"),
    "utf8"
  )

  expect(skill).toContain(appTemplatePath)
})

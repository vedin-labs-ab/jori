import { spawnSync } from "node:child_process"
import { expect, test } from "vitest"
import {
  sandboxArtifactRuntime,
  sandboxWorkspace,
} from "../../../contracts/runtime/sandbox"
import { workspaceBootstrapCommand } from "./index"

test("bootstraps the visible workspace and internal artifact runtime", () => {
  const command = workspaceBootstrapCommand()
  const syntaxCheck = spawnSync("bash", ["-n", "-c", command])

  expect(syntaxCheck.status).toBe(0)
  expect(command).toContain(
    `mkdir -p '${sandboxWorkspace}' '${sandboxArtifactRuntime}'`
  )
  expect(command).toContain(`chmod 755 '${sandboxWorkspace}'`)
})

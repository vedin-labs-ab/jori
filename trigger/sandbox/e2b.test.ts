import { spawnSync } from "node:child_process"
import { expect, test } from "vitest"
import { sandboxArtifactRuntime, sandboxWorkspace } from "./artifacts"
import { workspaceBootstrapCommand } from "./e2b"

test("bootstraps the visible workspace and internal artifact runtime", () => {
  const command = workspaceBootstrapCommand()
  const syntaxCheck = spawnSync("bash", ["-n", "-c", command])

  expect(syntaxCheck.status).toBe(0)
  expect(command).toContain(
    `mkdir -p '${sandboxWorkspace}' '${sandboxArtifactRuntime}'`
  )
  expect(command).toContain(
    `ln -s '/home/user/milo-workspace/node_modules' '${sandboxArtifactRuntime}/node_modules'`
  )
  expect(command).toContain(`chmod 755 '${sandboxWorkspace}'`)
})

import { spawnSync } from "node:child_process"
import { expect, test } from "vitest"
import { sandboxWorkspace } from "../workspace"
import { workspaceBootstrapCommand } from "./index"

test("bootstraps the visible workspace", () => {
  const command = workspaceBootstrapCommand()
  const syntaxCheck = spawnSync("bash", ["-n", "-c", command])

  expect(syntaxCheck.status).toBe(0)
  expect(command).toContain(`mkdir -p '${sandboxWorkspace}'`)
  expect(command).toContain(`chmod 755 '${sandboxWorkspace}'`)
})

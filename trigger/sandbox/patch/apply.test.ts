import { expect, test } from "vitest"
import { sandboxWorkspace } from "../../../contracts/runtime/sandbox"
import { type SandboxRuntime, type SandboxWriteFile } from "../types"
import { applyWorkspacePatch } from "./apply"

test("routes Begin Patch envelopes through file operations", async () => {
  const { sandbox, files } = fakeSandbox({
    [`${sandboxWorkspace}/repo/src/app.ts`]: "old\nkeep\n",
  })

  const result = await applyWorkspacePatch(sandbox, {
    cwd: "repo",
    patch: [
      "*** Begin Patch",
      "*** Add File: src/contract.ts",
      "+export const x = 1",
      "*** Update File: src/app.ts",
      "-old",
      "+new",
      "*** End Patch",
    ].join("\n"),
  })

  expect(result).toMatchObject({
    applied: true,
    files: ["src/contract.ts", "src/app.ts"],
  })
  expect(files.get(`${sandboxWorkspace}/repo/src/contract.ts`)).toBe(
    "export const x = 1\n"
  )
  expect(files.get(`${sandboxWorkspace}/repo/src/app.ts`)).toBe("new\nkeep\n")
})

test("rejects envelope paths that escape the workspace", async () => {
  const { sandbox } = fakeSandbox({})

  await expect(
    applyWorkspacePatch(sandbox, {
      patch: "*** Begin Patch\n*** Add File: ../escape.txt\n+x\n*** End Patch",
    })
  ).rejects.toThrow("escapes the Jori workspace")
})

test("updating a missing file fails with the original path", async () => {
  const { sandbox } = fakeSandbox({})

  await expect(
    applyWorkspacePatch(sandbox, {
      patch: "*** Begin Patch\n*** Update File: gone.ts\n-x\n+y\n*** End Patch",
    })
  ).rejects.toThrow("Cannot update a missing file: gone.ts")
})

function fakeSandbox(initial: Record<string, string>) {
  const files = new Map(Object.entries(initial))
  const sandbox = {
    async readFile(path: string) {
      const content = files.get(path)

      if (content === undefined) {
        throw new Error(`missing ${path}`)
      }

      return new TextEncoder().encode(content)
    },
    async writeFiles(writes: SandboxWriteFile[]) {
      for (const write of writes) {
        files.set(write.path, String(write.content))
      }
    },
    async runCommand() {
      return { exitCode: 0, stderr: "", stdout: "" }
    },
  } as unknown as SandboxRuntime

  return { files, sandbox }
}

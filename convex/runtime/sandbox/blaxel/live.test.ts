import { randomBytes } from "node:crypto"
import { afterEach, expect, test } from "vitest"
import { createLocalSandbox } from "../../../../test/sandbox"
import { executeCodingTool } from "../coding"
import { commandWrapperScript } from "../script"
import {
  type BlaxelSandbox,
  cloneIntoSandbox,
  collectCommandOutput,
  connectSandbox,
  createSandbox,
  killSandbox,
  readSandboxFile,
  runSandboxCommand,
  sandboxName,
  startSandboxCommand,
  waitForCommand,
  writeSandboxFiles,
} from "../support"
import { sandboxConnection } from "./connection"
import { sandboxFileInfo } from "./files"

const live = process.env.JORI_SANDBOX_LIVE === "1"
let created: string | undefined

afterEach(async () => {
  if (created) {
    await killSandbox(created)
  }
})

test.skipIf(!live)(
  "regional sandbox lifecycle, files, cancellation and reconnect",
  async () => {
    const sandbox = await createSandbox()
    created = sandboxName(sandbox)
    expect(sandbox.spec.region).toBe(sandboxConnection().region)
    const runtime = await runSandboxCommand(sandbox, {
      command:
        "id -u; node -v; git --version; curl --version | head -1; timeout --version | head -1",
    })
    expect(runtime.exitCode).toBe(0)
    expect(runtime.stdout).toContain("10001")
    expect(runtime.stdout).toContain("v26.3.0")
    const binary = randomBytes(6 * 1024 * 1024)
    const path = "/home/user/workspace/nested/probe.bin"
    await writeSandboxFiles(sandbox, [{ path, content: binary }])
    expect(await readSandboxFile(sandbox, path)).toEqual(new Uint8Array(binary))
    expect((await sandboxFileInfo(sandbox, path)).size).toBe(binary.length)
    await runSandboxCommand(sandbox, {
      command: "ln -s /etc /home/user/workspace/outside",
    })
    expect(
      (await sandboxFileInfo(sandbox, "/home/user/workspace/outside"))
        .symlinkTarget
    ).toBe("/etc")
    await verifyCommands(sandbox)
    await verifyBashTool(sandbox)
    await cloneIntoSandbox(sandbox, {
      repository: "octocat/Hello-World",
      remoteUrl: "https://github.com/octocat/Hello-World.git",
      token: "synthetic-no-access",
      username: "x-access-token",
    })
    expect(
      (
        await runSandboxCommand(sandbox, {
          command:
            "git -C /home/user/workspace/Hello-World rev-parse --is-inside-work-tree",
        })
      ).stdout.trim()
    ).toBe("true")
    // No connections or processes for 20s: Blaxel's standby threshold is 15s.
    await new Promise((resolve) => setTimeout(resolve, 20_000))
    const reconnected = await connectSandbox(created)
    expect(await readSandboxFile(reconnected, path)).toEqual(
      new Uint8Array(binary)
    )
    await killSandbox(created)
    await killSandbox(created)
    created = undefined
  },
  120_000
)

async function verifyBashTool(sandbox: BlaxelSandbox) {
  const runtime = createLocalSandbox({})
  runtime.startCommand = async (input) => {
    const token = crypto.randomUUID()
    const process = await startSandboxCommand(sandbox, {
      ...input,
      command: commandWrapperScript({
        command: input.command,
        token,
        callbackUrl: "http://127.0.0.1:1/callback",
      }),
    })
    expect(await waitForCommand(sandbox, process.pid, 10_000)).toBe(true)
    return await collectCommandOutput(sandbox, token)
  }
  const result = await executeCodingTool({
    sandbox: runtime,
    tool: "bash",
    input: {
      command: `values=(alpha beta); printf '%s\\n' "\${values[1]}"; node -v; id -u`,
    },
  })
  expect(result).toMatchObject({
    exitCode: 0,
    stdout: "beta\nv26.3.0\n10001\n",
    stderr: "",
  })
}

async function verifyCommands(sandbox: BlaxelSandbox) {
  const failure = await runSandboxCommand(sandbox, {
    command: "printf out; printf err >&2; exit 7",
  })
  expect(failure).toMatchObject({ exitCode: 7, stdout: "out", stderr: "err" })
  const token = crypto.randomUUID()
  const process = await startSandboxCommand(sandbox, {
    command: commandWrapperScript({
      command: "sleep 2; printf background",
      token,
      callbackUrl: "http://127.0.0.1:1/callback",
    }),
    timeoutMs: 10_000,
  })
  expect(await waitForCommand(sandbox, process.pid, 100)).toBe(false)
  expect(await waitForCommand(sandbox, process.pid, 10_000)).toBe(true)
  expect(await collectCommandOutput(sandbox, token)).toMatchObject({
    exitCode: 0,
    stdout: "background",
  })
  const long = await startSandboxCommand(sandbox, {
    command: "sleep 120",
    timeoutMs: 130_000,
  })
  await sandbox.process.kill(long.pid)
  expect((await sandbox.process.get(long.pid)).status).not.toBe("running")
  const timed = await runSandboxCommand(sandbox, {
    command: "sleep 10",
    timeoutMs: 1000,
  })
  expect(timed).toMatchObject({ exitCode: 124, timedOut: true })
}

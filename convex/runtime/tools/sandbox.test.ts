import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import {
  createRuntime,
  runTool,
  runtimeContext,
  runtimeId,
} from "../../../test/runtime"
import { createLocalSandbox } from "../../../test/sandbox"
import { isParked } from "../loop/park"
import { executeToolCall } from "./index"

test("bash parks on a slow command and collects it on the wake", async () => {
  const runtime = createRuntime({
    context: runtimeContext({ tools: [bashTool()] }),
    sandbox: createLocalSandbox({ "src/file.txt": "ok" }, true),
  })

  const parked = await executeToolCall({
    call: bashCall(),
    runtime,
    sequence: 100,
  })

  expect(isParked(parked)).toBe(true)
  expect(runtime.platform.park).toHaveBeenCalledWith(
    expect.objectContaining({
      condition: { kind: "command", pid: "4321" },
      token: "command-token",
    })
  )

  runtime.platform.readWaiter = vi.fn(async () => ({
    condition: { kind: "command" as const, pid: "4321" },
    token: "command-token",
  }))

  const result = await runTool({
    call: bashCall(),
    runtime,
    wake: { reason: "resolved", waiter: runtimeId<"waiters">("waiter_1") },
  })

  expect(JSON.parse(result.content)).toMatchObject({
    exitCode: 0,
    stdout: "ok",
  })
  expect(
    vi
      .mocked(runtime.platform.recordEvent)
      .mock.calls.map(([event]) => event.type)
  ).toEqual([
    "tool.started",
    "run.waiting",
    "tool.waiting",
    "tool.started",
    "run.resumed",
    "tool.completed",
  ])
})

function bashCall() {
  return {
    args: { command: "cat src/file.txt" },
    id: "call_1",
    name: "bash",
  }
}

function bashTool(): RuntimeTool {
  return {
    access: "write",
    description: "Run a shell command.",
    inputSchema: {},
    name: "bash",
    route: "sandbox",
  }
}

import { expect, test, vi } from "vitest"
import { type JsonObject, toJsonObject } from "../../../contracts/json"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { runLifecycleTools, sandboxTools } from "../native"

const invalidCalls: { name: string; args: JsonObject }[] = [
  { name: "start_agent", args: { task: "Test", title: "Test", tools: 4 } },
  {
    name: "start_agent",
    args: { task: "Test", title: "Test", tools: ["web_search", 4] },
  },
  { name: "start_agent", args: { task: "Test", title: "Test", extra: true } },
  { name: "wait_for_agents", args: { runIds: ["child", 4] } },
  { name: "wait_for_agents", args: { runIds: ["child", ""] } },
  { name: "wait_for_agents", args: { runIds: Array(21).fill("child") } },
  { name: "finish_run", args: { result: 42 } },
  { name: "finish_run", args: { reason: false } },
  { name: "finish_run", args: { extra: true } },
  { name: "read", args: { path: "test.txt", limit: 1.5 } },
  { name: "read", args: { path: "test.txt", offset: 0 } },
  { name: "grep", args: { pattern: "test", limit: 501 } },
  { name: "glob", args: { pattern: "*", limit: "5" } },
  { name: "bash", args: { command: "true", timeoutMs: 1 } },
  { name: "git", args: { args: ["status"], timeoutMs: 1_200_001 } },
]

test.each(
  invalidCalls
)("rejects invalid $name input before execution: $args", async ({
  name,
  args,
}) => {
  const runtime = validationRuntime(name)
  const result = await runTool({
    call: { args, id: "invalid", name },
    runtime,
  })

  expect(JSON.parse(result.content)).toMatchObject({ status: "error" })
  expect(runtime.platform.createAgentRun).not.toHaveBeenCalled()
  expect(runtime.platform.readAgentRuns).not.toHaveBeenCalled()
  expect(runtime.platform.finishRun).not.toHaveBeenCalled()
  expect(runtime.sandbox.runCommand).not.toHaveBeenCalled()
  expect(runtime.sandbox.startCommand).not.toHaveBeenCalled()
})

test("rejects a blocked native tool even if the model calls it", async () => {
  const runtime = validationRuntime("start_agent", "blocked")
  const result = await runTool({
    call: {
      args: { task: "Test", title: "Test" },
      id: "blocked",
      name: "start_agent",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toMatchObject({ status: "error" })
  expect(runtime.platform.createAgentRun).not.toHaveBeenCalled()
})

test("validates the published schema and preserves valid explicit empty access", async () => {
  const runtime = validationRuntime("start_agent")
  await runTool({
    call: {
      args: { task: "Test", title: "Test", tools: [] },
      id: "valid",
      name: "start_agent",
    },
    runtime,
  })

  expect(runtime.platform.createAgentRun).toHaveBeenCalledWith({
    parentId: "run_1",
    task: "Test",
    title: "Test",
    tools: [],
  })
})

function validationRuntime(
  name: string,
  mode: RuntimeTool["mode"] = "allowed"
) {
  const definition = [...sandboxTools, ...runLifecycleTools()].find(
    (tool) => tool.name === name
  )
  if (definition === undefined) {
    throw new Error(`Missing native schema: ${name}`)
  }
  const runtime = createRuntime({
    context: runtimeContext({
      tools: [
        {
          ...definition,
          mode,
          inputSchema: toJsonObject(definition.inputSchema),
        },
      ],
    }),
  })
  runtime.platform.readAgentRuns = vi.fn(async () => [])
  vi.spyOn(runtime.sandbox, "runCommand")
  vi.spyOn(runtime.sandbox, "startCommand")
  return runtime
}

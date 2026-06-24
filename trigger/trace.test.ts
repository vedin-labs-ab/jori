import { expect, test } from "vitest"
import { toolInputTrace } from "./trace"

test("summarizes git tool inputs without command output", () => {
  expect(
    toolInputTrace(
      "git",
      {
        args: ["log", "--oneline", "-10"],
        cwd: "milo",
        timeoutMs: 1000,
      },
      "tool.started"
    )
  ).toEqual({
    input: {
      args: ["log", "--oneline", "-10"],
      cwd: "milo",
      timeoutMs: 1000,
    },
  })
})

test("summarizes bash input as a bounded command preview", () => {
  expect(
    toolInputTrace(
      "bash",
      {
        command: `printf ${"x".repeat(600)}`,
        cwd: "milo",
      },
      "tool.started"
    )
  ).toEqual({
    input: {
      command: `printf ${"x".repeat(493)}`,
      cwd: "milo",
    },
  })
})

test("does not summarize unknown or completed tool calls", () => {
  expect(
    toolInputTrace("notion_create_page", { title: "Secret" }, "tool.started")
  ).toEqual({})
  expect(toolInputTrace("git", { args: ["status"] }, "tool.completed")).toEqual(
    {}
  )
})

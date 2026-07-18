import { expect, test } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { recoveryActions } from "./recovery"

test("lists completed write actions joined to their call inputs", () => {
  const actions = recoveryActions([
    trace("tool.started", {
      callId: "call_1",
      data: {
        tool: sendTool(),
        input: { to: "sam@example.com", subject: "Morning Briefing" },
      },
    }),
    trace("tool.completed", {
      callId: "call_1",
      data: { tool: sendTool(), result: summary(), provider: null },
    }),
    trace("tool.completed", {
      callId: "call_2",
      data: {
        tool: { name: "search_runs", route: "convex", access: "read" },
        result: summary(),
        provider: null,
      },
    }),
    trace("tool.started", {
      callId: "call_3",
      data: { tool: sendTool(), input: { subject: "Never completed" } },
    }),
  ] as unknown as Doc<"traces">[])

  expect(actions).toEqual([
    {
      name: "google_gmail_send_message",
      detail: '{"to":"sam@example.com","subject":"Morning Briefing"}',
    },
  ])
})

test("joins inputs per attempt so retried calls keep their own details", () => {
  const actions = recoveryActions([
    trace("tool.started", {
      attempt: 1,
      callId: "call_1",
      data: { tool: sendTool(), input: { subject: "first" } },
    }),
    trace("tool.started", {
      attempt: 2,
      callId: "call_1",
      data: { tool: sendTool(), input: { subject: "second" } },
    }),
    trace("tool.completed", {
      attempt: 1,
      callId: "call_1",
      data: { tool: sendTool(), result: summary(), provider: null },
    }),
  ] as unknown as Doc<"traces">[])

  expect(actions).toEqual([
    { name: "google_gmail_send_message", detail: '{"subject":"first"}' },
  ])
})

test("truncates oversized inputs", () => {
  const actions = recoveryActions([
    trace("tool.started", {
      callId: "call_1",
      data: { tool: sendTool(), input: { body: "x".repeat(500) } },
    }),
    trace("tool.completed", {
      callId: "call_1",
      data: { tool: sendTool(), result: summary(), provider: null },
    }),
  ] as unknown as Doc<"traces">[])

  expect(actions[0].detail?.endsWith("…")).toBe(true)
  expect(actions[0].detail?.length).toBeLessThanOrEqual(161)
})

function trace(
  type: string,
  fields: { attempt?: number; callId: string; data: unknown }
) {
  return {
    type,
    attempt: fields.attempt ?? 1,
    callId: fields.callId,
    data: fields.data,
  }
}

function sendTool() {
  return {
    name: "google_gmail_send_message",
    route: "convex",
    access: "write",
  }
}

function summary() {
  return { kind: "object", size: 1 }
}

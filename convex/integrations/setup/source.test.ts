import { describe, expect, test } from "vitest"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { setupSourceFromInput, surfaceIdentityProvider } from "./source"

describe("setup link source", () => {
  test("captures the current message surface and actor identity", () => {
    const input = {
      type: "message",
      messageIntegration: "slack",
      run: { _id: "run_1" },
      integration: { _id: "integration_1" },
      message: {
        _id: "message_1",
        actor: {
          kind: "user",
          externalId: "U123",
          email: "ada@example.com",
          name: "Ada",
        },
      },
    } as unknown as AgentRuntimeInput

    expect(setupSourceFromInput(input)).toEqual({
      surface: "slack",
      integrationId: "integration_1",
      messageId: "message_1",
      runId: "run_1",
      actor: {
        externalId: "U123",
        email: "ada@example.com",
        name: "Ada",
      },
    })
  })

  test("uses Milo as the source for non-message runs", () => {
    const input = {
      type: "instruction",
      run: { _id: "run_1" },
    } as unknown as AgentRuntimeInput

    expect(setupSourceFromInput(input)).toEqual({
      surface: "milo",
      runId: "run_1",
    })
  })

  test("maps intake surfaces to identity providers", () => {
    expect(surfaceIdentityProvider("slack")).toBe("slack")
    expect(surfaceIdentityProvider("github")).toBe("github")
    expect(surfaceIdentityProvider("linear")).toBe("linear")
    expect(surfaceIdentityProvider("milo")).toBeUndefined()
  })
})

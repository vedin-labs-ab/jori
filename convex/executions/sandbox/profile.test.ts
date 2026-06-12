import { describe, expect, test } from "vitest"
import { e2bSandboxTemplate } from "./harness"
import { resolveAgentRuntimeProfile } from "./profile"

describe("agent runtime profile", () => {
  test("defaults to a 30 minute agent run budget", () => {
    const profile = resolveAgentRuntimeProfile({ environment: {} })

    expect(profile).toEqual({
      agentId: "default",
      sandbox: {
        template: e2bSandboxTemplate,
        timeoutMs: 35 * 60 * 1_000,
      },
      timeouts: {
        bootstrapMs: 30_000,
        codexMs: 30 * 60 * 1_000,
        preflightMs: 30_000,
        traceServerMs: 0,
      },
    })
  })

  test("allows run and sandbox timeout overrides", () => {
    const profile = resolveAgentRuntimeProfile({
      agentId: "message-agent",
      environment: {
        E2B_SANDBOX_TEMPLATE: "custom-template",
        MILO_AGENT_RUN_TIMEOUT_MINUTES: "12",
        MILO_AGENT_SANDBOX_TIMEOUT_MS: "900000",
      },
    })

    expect(profile.agentId).toBe("message-agent")
    expect(profile.sandbox).toEqual({
      template: "custom-template",
      timeoutMs: 900_000,
    })
    expect(profile.timeouts.codexMs).toBe(12 * 60 * 1_000)
  })

  test("prefers millisecond overrides over minute overrides", () => {
    const profile = resolveAgentRuntimeProfile({
      environment: {
        MILO_AGENT_RUN_TIMEOUT_MINUTES: "20",
        MILO_AGENT_RUN_TIMEOUT_MS: "45000",
      },
    })

    expect(profile.timeouts.codexMs).toBe(45_000)
  })

  test("rejects invalid overrides", () => {
    expect(() =>
      resolveAgentRuntimeProfile({
        environment: {
          MILO_AGENT_RUN_TIMEOUT_MINUTES: "0",
        },
      })
    ).toThrow("MILO_AGENT_RUN_TIMEOUT_MINUTES")
  })
})

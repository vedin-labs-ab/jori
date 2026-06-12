import { e2bSandboxTemplate } from "./harness"

const minuteMs = 60 * 1_000
const defaultAgentRunTimeoutMs = 30 * minuteMs
const defaultSandboxBufferMs = 5 * minuteMs
const defaultSetupTimeoutMs = 30_000

export type AgentRuntimeProfile = {
  agentId: string
  sandbox: {
    template: string
    timeoutMs: number
  }
  timeouts: {
    bootstrapMs: number
    codexMs: number
    preflightMs: number
    traceServerMs: number
  }
}

type RuntimeEnvironment = Partial<Record<string, string | undefined>>

export function resolveAgentRuntimeProfile(
  args: { agentId?: string; environment?: RuntimeEnvironment } = {}
): AgentRuntimeProfile {
  const environment = args.environment ?? process.env
  const codexMs =
    readDuration(environment, {
      minutesName: "MILO_AGENT_RUN_TIMEOUT_MINUTES",
      msName: "MILO_AGENT_RUN_TIMEOUT_MS",
    }) ?? defaultAgentRunTimeoutMs
  const sandboxMs =
    readDuration(environment, {
      minutesName: "MILO_AGENT_SANDBOX_TIMEOUT_MINUTES",
      msName: "MILO_AGENT_SANDBOX_TIMEOUT_MS",
    }) ?? codexMs + defaultSandboxBufferMs

  return {
    agentId: args.agentId ?? "default",
    sandbox: {
      template:
        readEnvironmentVariable(environment, "E2B_SANDBOX_TEMPLATE") ??
        e2bSandboxTemplate,
      timeoutMs: sandboxMs,
    },
    timeouts: {
      bootstrapMs: defaultSetupTimeoutMs,
      codexMs,
      preflightMs: defaultSetupTimeoutMs,
      traceServerMs: 0,
    },
  }
}

function readDuration(
  environment: RuntimeEnvironment,
  names: {
    minutesName: string
    msName: string
  }
) {
  return (
    readMilliseconds(environment, names.msName) ??
    readMinutes(environment, names.minutesName)
  )
}

function readMilliseconds(environment: RuntimeEnvironment, name: string) {
  const value = readEnvironmentVariable(environment, name)

  if (value === undefined) {
    return undefined
  }

  return parsePositiveDuration(
    value,
    `${name} must be a positive number of milliseconds.`
  )
}

function readMinutes(environment: RuntimeEnvironment, name: string) {
  const value = readEnvironmentVariable(environment, name)

  if (value === undefined) {
    return undefined
  }

  return (
    parsePositiveDuration(
      value,
      `${name} must be a positive number of minutes.`
    ) * minuteMs
  )
}

function parsePositiveDuration(value: string, message: string) {
  const duration = Number(value)

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(message)
  }

  return Math.round(duration)
}

function readEnvironmentVariable(
  environment: RuntimeEnvironment,
  name: string
) {
  const value = environment[name]?.trim()

  return value === "" ? undefined : value
}

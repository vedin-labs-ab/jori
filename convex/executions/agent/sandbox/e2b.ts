"use node"

import { Sandbox } from "e2b"
import { createCodexConfig } from "../codex"
import { type ToolBundle, type ToolPreflight } from "../tools/types"
import { runCommand, writeSandboxFiles } from "./commands"
import {
  createBootstrapFiles,
  createPromptFile,
  createTraceServerFiles,
} from "./files"
import {
  codexHome,
  createBootstrapCommand,
  createCodexCommand,
  createTraceServerCommand,
  tracePort,
  workspace,
} from "./harness"
import {
  createToolPreflightCommand,
  createToolPreflightEnv,
} from "./preflights"
import { type AgentRuntimeProfile, resolveAgentRuntimeProfile } from "./profile"
import {
  assertCommandSucceeded,
  assertSetupCommandSucceeded,
  CodexRunError,
  type CommandTrace,
  createCommandTrace,
  formatError,
  recordSetupTrace,
  type SetupTrace,
} from "./trace"

export type E2BCodexRunArgs = {
  agentId?: string
  authJsonBase64: string
  onSandboxCreated: (sandbox: {
    sandboxId: string
    traceHost: string
  }) => Promise<void>
  prompt: string
  toolBundle: ToolBundle
  traceToken: string
  webSearch: boolean
}

export type E2BCodexRunResult = {
  trace: string
}

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

export async function runCodexInE2B(args: E2BCodexRunArgs) {
  let sandbox: E2BSandbox | undefined
  const setupTraces: SetupTrace[] = []
  const profile = resolveAgentRuntimeProfile({ agentId: args.agentId })

  try {
    sandbox = await createE2BSandbox(profile)
    await startTraceServer(sandbox, args.traceToken, profile)
    await args.onSandboxCreated({
      sandboxId: sandbox.sandboxId,
      traceHost: sandbox.getHost(tracePort),
    })
    assertSetupCommandSucceeded(
      recordSetupTrace(
        setupTraces,
        "bootstrap",
        await bootstrapCodex(sandbox, { ...args, profile })
      ),
      "Could not start the run environment.",
      setupTraces
    )

    for (const preflightTrace of await verifyPreflights(
      sandbox,
      args.toolBundle.preflights,
      profile
    )) {
      assertSetupCommandSucceeded(
        recordSetupTrace(
          setupTraces,
          `preflight:${preflightTrace.type}`,
          preflightTrace.trace
        ),
        "An integration check failed while starting the run.",
        setupTraces
      )
    }

    const agentTrace = await executeCodex(sandbox, args, profile)
    const trace = agentTrace.stdout
    assertCommandSucceeded(
      agentTrace,
      `Codex exited with code ${agentTrace.exitCode}.`,
      trace
    )

    return { trace }
  } catch (error) {
    if (error instanceof CodexRunError) {
      throw error
    }

    throw new CodexRunError(formatError(error))
  } finally {
    await sandbox?.kill().catch(() => undefined)
  }
}

export async function killE2BSandbox(sandboxId: string) {
  await Sandbox.kill(sandboxId, { apiKey: requireE2BApiKey() }).catch(
    () => undefined
  )
}

async function createE2BSandbox(profile: AgentRuntimeProfile) {
  return await Sandbox.create(profile.sandbox.template, {
    apiKey: requireE2BApiKey(),
    allowInternetAccess: true,
    metadata: {
      agent: profile.agentId,
      app: "milo",
      runtime: "codex",
    },
    timeoutMs: profile.sandbox.timeoutMs,
  })
}

function requireE2BApiKey() {
  const apiKey = process.env.E2B_API_KEY

  if (apiKey === undefined) {
    throw new Error("Missing E2B_API_KEY")
  }

  return apiKey
}

async function bootstrapCodex(
  sandbox: E2BSandbox,
  args: {
    authJsonBase64: string
    profile: AgentRuntimeProfile
    toolBundle: ToolBundle
    webSearch: boolean
  }
) {
  await writeSandboxFiles(
    sandbox,
    createBootstrapFiles({
      authJsonBase64: args.authJsonBase64,
      codexConfig: createCodexConfig({
        mcpServers: args.toolBundle.mcpServers,
        webSearch: args.webSearch,
      }),
      sandboxFiles: args.toolBundle.sandboxFiles,
    }),
    args.profile.timeouts.bootstrapMs
  )

  const result = await runCommand(sandbox, createBootstrapCommand(), {
    envs: {
      CODEX_HOME: codexHome,
      MILO_WORKSPACE: workspace,
    },
    timeoutMs: args.profile.timeouts.bootstrapMs,
  })

  return createCommandTrace(result)
}

async function startTraceServer(
  sandbox: E2BSandbox,
  traceToken: string,
  profile: AgentRuntimeProfile
) {
  await writeSandboxFiles(
    sandbox,
    createTraceServerFiles(),
    profile.timeouts.traceServerMs
  )

  await sandbox.commands.run(createTraceServerCommand(), {
    background: true,
    envs: {
      MILO_TRACE_TOKEN: traceToken,
    },
    timeoutMs: profile.timeouts.traceServerMs,
  })
}

async function executeCodex(
  sandbox: E2BSandbox,
  args: E2BCodexRunArgs,
  profile: AgentRuntimeProfile
) {
  let streamedStdout = ""
  await writeSandboxFiles(
    sandbox,
    [createPromptFile(args.prompt)],
    profile.timeouts.bootstrapMs
  )

  const result = await runCommand(sandbox, createCodexCommand(), {
    cwd: workspace,
    envs: { CODEX_HOME: codexHome },
    onStdout: (data) => {
      streamedStdout += data
    },
    timeoutMs: profile.timeouts.codexMs,
  })

  // When the sandbox is killed mid-run (user stop) the command error carries
  // no output, so fall back to the streamed copy to keep the partial trace.
  return createCommandTrace({
    ...result,
    stdout: result.stdout === "" ? streamedStdout : result.stdout,
  })
}

async function verifyPreflights(
  sandbox: E2BSandbox,
  preflights: ToolPreflight[],
  profile: AgentRuntimeProfile
) {
  const traces: Array<{ type: ToolPreflight["type"]; trace: CommandTrace }> = []

  for (const preflight of preflights) {
    traces.push({
      type: preflight.type,
      trace: await verifyToolPreflight(sandbox, preflight, profile),
    })
  }

  return traces
}

async function verifyToolPreflight(
  sandbox: E2BSandbox,
  preflight: ToolPreflight,
  profile: AgentRuntimeProfile
) {
  const result = await runCommand(
    sandbox,
    createToolPreflightCommand(preflight),
    {
      envs: createToolPreflightEnv(preflight),
      timeoutMs: profile.timeouts.preflightMs,
    }
  )

  return createCommandTrace(result)
}

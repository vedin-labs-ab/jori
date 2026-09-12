import { vi } from "vitest"
import { encodeToolResult } from "../contracts/json"
import { type DrainedSessionBatch } from "../contracts/runtime/context"
import {
  type ApprovalExecution,
  type RunHandoffs,
} from "../contracts/runtime/handoffs"
import { type TranscriptMessage } from "../convex/runs/execution/transcript/schema"
import { type RuntimePlatform } from "../convex/runtime/platform/types"
import { type SandboxRuntime } from "../convex/runtime/sandbox/types"
import { runtimeId } from "./runtime"

export type FakePlatform = ReturnType<typeof createPlatform>

/**
 * The platform as an in-memory record: a transcript the loop reads back, a
 * handoff snapshot per reconcile, drained session batches, and a waiter id
 * per park. Every method is a spy, so tests assert on calls the way they did
 * against the Convex client.
 */
export function createPlatform(
  options: { handoffs?: RunHandoffs[]; sessions?: DrainedSessionBatch[] } = {}
) {
  const transcript: TranscriptMessage[] = []
  const handoffs = [...(options.handoffs ?? [])]
  const sessions = [...(options.sessions ?? [])]
  let waiters = 0

  const platform = {
    ...answers(),
    appendTranscript: vi.fn(async (messages: TranscriptMessage[]) => {
      transcript.push(...messages)
    }),
    markApprovalConsumed: vi.fn(
      async (args: { message?: TranscriptMessage }) => {
        if (args.message !== undefined) {
          transcript.push(args.message)
        }
      }
    ),
    drainSession: vi.fn(async () => sessions.shift() ?? emptySessionBatch()),
    listTranscript: vi.fn(async () => [...transcript]),
    loadRunHandoffs: vi.fn(async () => handoffs.shift() ?? emptyHandoffs()),
    park: vi.fn(async () => {
      waiters += 1

      return {
        eventId: `event_${waiters}`,
        waiterId: runtimeId<"waiters">(`waiter_${waiters}`),
      }
    }),
    tailTranscript: vi.fn(async () => transcriptTail(transcript)),
  }

  return Object.assign(platform as unknown as RuntimePlatform, {
    spies: platform,
    transcript,
  })
}

/** A sandbox that is never reached. Tests that exercise sandbox tools use
 *  `createLocalSandbox` from `test/sandbox.ts` instead. */
export function createSandbox(): SandboxRuntime {
  const unused = () => {
    throw new Error("This test does not use the sandbox.")
  }

  return {
    cloneRepository: unused,
    exportFile: unused,
    finishCommand: unused,
    importFile: unused,
    readFile: unused,
    runCommand: unused,
    startCommand: unused,
    writeFiles: unused,
  }
}

/** The calls whose answer never depends on what the run did before. */
function answers() {
  return {
    addReaction: vi.fn(async () => ({ status: "added" })),
    callTool: vi.fn(async () => ({ status: "sent" })),
    clearDraft: vi.fn(async () => undefined),
    createAgentRun: vi.fn(async () => ({
      runId: runtimeId<"runs">("run_child"),
    })),
    executeApproval: vi.fn(
      async (): Promise<ApprovalExecution> => ({
        state: "done",
        result: encodeToolResult({ status: "posted" }),
      })
    ),
    fetchGitHubCloneCredentials: vi.fn(async () => ({
      remoteUrl: "https://github.com/acme/app.git",
      token: "secret-token",
      username: "x-access-token",
    })),
    finishRun: vi.fn(async () => undefined),
    generateImage: vi.fn<RuntimePlatform["generateImage"]>(async () => {
      throw new Error("This test does not generate images.")
    }),
    markOfferConsumed: vi.fn(async () => undefined),
    readAgentRuns: vi.fn(async () => []),
    readWaiter: vi.fn(async () => null),
    recordEvent: vi.fn(async () => undefined),
    recordUsage: vi.fn(async () => undefined),
    requestApproval: vi.fn(async () => ({
      approvalId: runtimeId<"approvals">("approval_1"),
      code: "ABC123",
      instruction: "Approval requested.",
      status: "approval_requested",
    })),
    resolveWaiter: vi.fn(async () => undefined),
    retarget: vi.fn(async () => undefined),
    sendReply: vi.fn(async () => ({ status: "sent" })),
    stopAgentRun: vi.fn(async () => ({
      runId: runtimeId<"runs">("run_child"),
      status: "stopped",
    })),
    uploadFile: vi.fn(async () => ({
      fileId: runtimeId<"files">("file_1"),
      mimeType: "image/png",
      name: "file.png",
      size: 1,
      url: null,
    })),
    writeDraft: vi.fn(async () => undefined),
  }
}

function transcriptTail(transcript: TranscriptMessage[]) {
  const results: TranscriptMessage[] = []

  for (const message of [...transcript].reverse()) {
    if (message.role === "assistant") {
      return { assistant: message, results: results.reverse() }
    }

    if (message.role !== "tool") {
      break
    }

    results.push(message)
  }

  return { assistant: null, results: [] }
}

function emptyHandoffs(): RunHandoffs {
  return { approvals: [], offers: [] }
}

function emptySessionBatch(): DrainedSessionBatch {
  return { contexts: [], hasMore: false, interactions: [], messages: [] }
}

import { createReplyScanner } from "../model/reply"
import {
  type ModelDelta,
  type ModelResponse,
  type ModelToolCallDelta,
} from "../model/types"
import { type AgentRuntime, type RuntimePlatform } from "../platform"
import { formatError } from "../trace/events"

/** The console's view of the reply a turn is composing. */
export type Draft = {
  /** Take the finished turn: its reply's text stays for the act step to
   *  replace with the message, and a turn without a reply leaves nothing. */
  close(response: ModelResponse): Promise<void>
  /** A turn that failed shows nothing of what it wrote. */
  discard(): Promise<void>
  onDelta(delta: ModelDelta): void
  /** A turn starts blank, whatever an earlier attempt left. */
  reset(): Promise<void>
}

export type DraftWriter = {
  /** Wait for the write in flight and take no more; answers with the text
   *  that has landed. */
  settle(): Promise<string>
  update(text: string): void
}

const replyTool = "send_reply"
const writeIntervalMs = 250
const clauseEnd = /[.,;:!?\n]\s*$/

/**
 * The console shows Jori's reply as it is written: the text of the turn's
 * first `send_reply` call, read out of the call's arguments as they stream
 * and written to the run's draft row. Other surfaces show nothing until the
 * reply lands, so they have no draft.
 */
export function openDraft(runtime: AgentRuntime, turn: number): Draft | null {
  if (runtime.context.activeSurface?.surface !== "console") {
    return null
  }

  return new ConsoleDraft(runtime.platform, turn)
}

/**
 * Writes the draft as it grows with one write in flight at a time: the next
 * starts once the last has landed, and no sooner than the interval after it
 * began unless the text has reached a clause boundary. Each write carries
 * the whole text, so a lost one costs nothing but a moment.
 */
export function createDraftWriter(
  write: (text: string) => Promise<void>
): DraftWriter {
  let closed = false
  let inflight: Promise<void> | null = null
  let latest = ""
  let startedAt = Number.NEGATIVE_INFINITY
  let timer: ReturnType<typeof setTimeout> | null = null
  let written = ""

  function attempt() {
    if (closed || inflight !== null || latest === written) {
      return
    }

    const wait = startedAt + writeIntervalMs - Date.now()

    if (wait <= 0 || clauseEnd.test(latest)) {
      start()

      return
    }

    timer ??= setTimeout(() => {
      timer = null
      attempt()
    }, wait)
  }

  function start() {
    const text = latest

    clearTimer()
    startedAt = Date.now()
    inflight = write(text)
      .catch((error: unknown) => {
        console.warn("Draft write failed.", { error: formatError(error) })
      })
      .then(() => {
        written = text
        inflight = null
        attempt()
      })
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    settle: async () => {
      closed = true
      clearTimer()
      await inflight

      return written
    },
    update: (text) => {
      latest = text
      attempt()
    },
  }
}

class ConsoleDraft implements Draft {
  private readonly scanner = createReplyScanner()
  private readonly writer: DraftWriter
  private replyIndex: number | null = null

  constructor(
    private readonly platform: RuntimePlatform,
    private readonly turn: number
  ) {
    this.writer = createDraftWriter((text) =>
      platform.writeDraft({ text, turn })
    )
  }

  onDelta = (delta: ModelDelta) => {
    for (const call of delta.toolCalls ?? []) {
      this.scan(call)
    }
  }

  reset = () => this.platform.clearDraft()

  discard = async () => {
    await this.writer.settle()
    await this.platform.clearDraft()
  }

  close = async (response: ModelResponse) => {
    const written = await this.writer.settle()
    const text = replyText(response)

    if (text === null) {
      await this.platform.clearDraft()
    } else if (text !== written) {
      await this.platform.writeDraft({ text, turn: this.turn })
    }
  }

  private scan(call: ModelToolCallDelta) {
    if (this.replyIndex === null && call.name === replyTool) {
      this.replyIndex = call.index
    }

    if (call.index !== this.replyIndex) {
      return
    }

    const scan = this.scanner.push(call.argumentsDelta)

    if (scan.state !== "abandoned" && scan.text !== "") {
      this.writer.update(scan.text)
    }
  }
}

/** The text of the turn's first reply call, once the call is whole. */
function replyText(response: ModelResponse) {
  if (response.type !== "tool_calls") {
    return null
  }

  const reply = response.toolCalls.find((call) => call.name === replyTool)

  return typeof reply?.args.text === "string" ? reply.args.text : null
}

import { createReplyScanner } from "../model/reply"
import {
  type ModelDelta,
  type ModelResponse,
  type ModelToolCallDelta,
} from "../model/types"
import { type AgentRuntime, type RuntimePlatform } from "../platform/types"
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

/** What the draft holds: the model's reasoning as far as it has come,
 *  then the reply's text. */
export type DraftContent = {
  reasoning: string
  text: string
}

export type DraftWriter = {
  /** Wait for the write in flight and take no more; answers with the
   *  content that has landed, or nothing when no write did. */
  settle(): Promise<DraftContent | null>
  update(content: DraftContent): void
}

const replyTool = "send_reply"
const writeIntervalMs = 250
const clauseEnd = /[.,;:!?\n]\s*$/
/** The reasoning kept in the row: its last stretch, enough to read what
 *  the model is on, never the whole of a long think. */
const reasoningLimit = 2_000

/**
 * The console shows Jori's turn as it is written: the model's reasoning
 * while it thinks, then the text of the turn's first `send_reply` call,
 * read out of the call's arguments as they stream, both written to the
 * run's draft row. Other surfaces show nothing until the reply lands, so
 * they have no draft.
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
 * began unless the reply's text has reached a clause boundary. Each write
 * carries the whole content, so a lost one costs nothing but a moment.
 */
export function createDraftWriter(
  write: (content: DraftContent) => Promise<void>
): DraftWriter {
  let closed = false
  let inflight: Promise<void> | null = null
  let latest: DraftContent | null = null
  let startedAt = Number.NEGATIVE_INFINITY
  let timer: ReturnType<typeof setTimeout> | null = null
  let written: DraftContent | null = null

  function attempt() {
    if (closed || inflight !== null || latest === null) {
      return
    }

    if (written !== null && sameContent(latest, written)) {
      return
    }

    const wait = startedAt + writeIntervalMs - Date.now()

    if (wait <= 0 || endsClause(latest, written)) {
      start(latest)

      return
    }

    timer ??= setTimeout(() => {
      timer = null
      attempt()
    }, wait)
  }

  function start(content: DraftContent) {
    clearTimer()
    startedAt = Date.now()
    inflight = write(content)
      .catch((error: unknown) => {
        console.warn("Draft write failed.", { error: formatError(error) })
      })
      .then(() => {
        written = content
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
    update: (content) => {
      latest = content
      attempt()
    },
  }
}

// The reply is worth showing at once at a clause boundary; reasoning
// waits its interval, so a still reply does not send every thought.
function endsClause(latest: DraftContent, written: DraftContent | null) {
  return latest.text !== (written?.text ?? "") && clauseEnd.test(latest.text)
}

function sameContent(left: DraftContent, right: DraftContent) {
  return left.text === right.text && left.reasoning === right.reasoning
}

class ConsoleDraft implements Draft {
  private readonly scanner = createReplyScanner()
  private readonly writer: DraftWriter
  private content: DraftContent = { reasoning: "", text: "" }
  private replyIndex: number | null = null

  constructor(
    private readonly platform: RuntimePlatform,
    private readonly turn: number
  ) {
    this.writer = createDraftWriter((content) =>
      platform.writeDraft({ ...content, turn })
    )
  }

  onDelta = (delta: ModelDelta) => {
    if (delta.reasoning !== undefined && delta.reasoning !== "") {
      this.offer({
        reasoning: (this.content.reasoning + delta.reasoning).slice(
          -reasoningLimit
        ),
      })
    }

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
    } else if (text !== written?.text) {
      await this.platform.writeDraft({
        ...this.content,
        text,
        turn: this.turn,
      })
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
      this.offer({ text: scan.text })
    }
  }

  private offer(change: Partial<DraftContent>) {
    this.content = { ...this.content, ...change }
    this.writer.update(this.content)
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

import { joriModel, modelRates } from "../../../contracts/billing"
import { getNextCronRunAt } from "../../../contracts/jobs/schedule/cron"
import { type ToolSurface } from "../../shared/integrations"
import { dayMs, type SeedContext, seedTimezone } from "../context"
import { threads } from "../threads"
import { evented, manual, scheduled } from "./sources"

// Sixty days of work, derived rather than listed. Scheduled work is walked
// forward with the same cron reader the product schedules with, so a run
// history lands exactly on the days its job would have fired;
// message-caused work comes from the Slack lines that actually addressed
// Jori. Variation is hashed from each item's own identity, so a re-seed
// produces the same history rather than a new one.

export const historyDays = 60

/** Seeded cost is priced from the same rate table the ledger prices with, so
 *  a day's spend and its token count never disagree. */
const rate = modelRates[joriModel]

export type WorkItem = {
  at: number
  title: string
  trigger: "schedule" | "event" | "message" | "manual"
  surface: ToolSurface
  status: "completed" | "failed" | "stopped" | "running"
  /** The job's name, absent for interactive work. */
  job?: string
  folder?: string
  /** The person who asked, by email; absent for scheduled work. */
  person?: string
  channel?: string
  /** The Slack line that addressed Jori, for work a message caused. */
  mention?: string
  durationMs: number
  micros: number
  tokens: { input: number; output: number }
  result?: string
  error?: string
}

/** The identity an evented run and the event that woke it agree on. */
export function eventKey(item: WorkItem) {
  return `${item.job ?? ""}:${item.at}`
}

export function workItems(seed: SeedContext): WorkItem[] {
  return [
    ...scheduledItems(seed),
    ...eventedItems(seed),
    ...messageItems(seed),
    ...manualItems(seed),
  ].sort((left, right) => left.at - right.at)
}

function scheduledItems(seed: SeedContext) {
  const items: WorkItem[] = []

  for (const source of scheduled) {
    const stopAt = seed.now - (source.pausedAfter ?? 0) * dayMs
    let at = getNextCronRunAt(
      source.cron,
      seed.now - historyDays * dayMs,
      seedTimezone
    )

    while (at < stopAt) {
      items.push(
        shape(source.name, at, {
          at,
          title: source.name,
          trigger: "schedule",
          surface: "jori",
          job: source.name,
          folder: source.folder,
          status: "completed",
          durationMs: 0,
          micros: 0,
          tokens: { input: 0, output: 0 },
        })
      )
      at = getNextCronRunAt(source.cron, at, seedTimezone)
    }
  }

  return items
}

function eventedItems(seed: SeedContext) {
  return evented.flatMap((source) =>
    source.on.map((day) =>
      shape(`${source.name}:${day}`, seed.now - day * dayMs, {
        at: seed.now - day * dayMs + 11 * 60 * 60 * 1000,
        title: source.name,
        trigger: "event",
        surface: "slack",
        job: source.name,
        folder: source.folder,
        channel: source.channel,
        status: "completed",
        durationMs: 0,
        micros: 0,
        tokens: { input: 0, output: 0 },
      })
    )
  )
}

/** Work someone started by addressing Jori in a channel. */
function messageItems(seed: SeedContext) {
  return threads
    .filter((message) => message.mentioned === true)
    .map((message, index) => {
      const [days, hour, minute] = message.at
      const at =
        seed.now -
        days * dayMs +
        (hour * 60 + minute) * 60 * 1000 -
        12 * 60 * 60 * 1000

      return shape(`${message.author}:${index}`, at, {
        at,
        title: message.text.replace(/^Jori,\s*/, "").replace(/\.$/, ""),
        trigger: "message",
        mention: message.text,
        surface: "slack",
        person: `${message.author}@vedinlabs.com`,
        channel: message.channel,
        status: "completed",
        durationMs: 0,
        micros: 0,
        tokens: { input: 0, output: 0 },
      })
    })
}

function manualItems(seed: SeedContext) {
  return manual.map((entry) =>
    shape(entry.title, seed.now - entry.day * dayMs, {
      at: seed.now - entry.day * dayMs,
      title: entry.title,
      trigger: "manual",
      surface: "jori",
      person: entry.person,
      folder: entry.folder,
      status: "completed",
      durationMs: 0,
      micros: 0,
      tokens: { input: 0, output: 0 },
    })
  )
}

/** Gives one item its cost, duration, and outcome from a hash of its own
 *  identity, so the same seed always produces the same history. */
function shape(identity: string, at: number, item: WorkItem): WorkItem {
  const roll = hash(`${identity}:${Math.floor(at / dayMs)}`)
  const failed = roll % 17 === 0
  const inputTokens = 9_000 + (roll % 96_000)
  const outputTokens = 400 + (roll % 4_600)

  return {
    ...item,
    status: failed ? "failed" : "completed",
    durationMs: 4_000 + (roll % 96_000),
    micros: Math.round(
      inputTokens * rate.inputMicrosPerToken +
        outputTokens * rate.outputMicrosPerToken
    ),
    tokens: { input: inputTokens, output: outputTokens },
    ...(failed
      ? { error: failures[roll % failures.length] }
      : { result: undefined }),
  }
}

const failures = [
  "Slack returned 429 for conversations_history and the retry budget was spent.",
  "The run asked for a tool it was not granted: github_commit_to_pull_request.",
  "A table row failed validation: Seats expected an integer.",
  "The model call timed out after two attempts.",
]

/** A small deterministic hash: enough spread for fixture variation, and
 *  stable across re-seeds, which Math.random would not be. */
function hash(value: string) {
  let result = 2_166_136_261

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16_777_619) >>> 0
  }

  return result
}

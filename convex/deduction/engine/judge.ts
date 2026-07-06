import {
  type PromptTemplateId,
  promptTemplates,
} from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type Doc } from "../../_generated/dataModel"
import { requestStructured } from "../../model/structured"
import { judgeMaxTokens, judgeModel, judgeReasoning } from "../limits"
import { type Citation } from "./rules"

// One structured judge call: a charter template as the system prompt, one
// JSON payload as the user message, a strict output schema on the wire.
export async function requestJudge(options: {
  charter: PromptTemplateId
  schemaName: string
  schema: Record<string, unknown>
  payload: unknown
}): Promise<Record<string, unknown>> {
  return await requestStructured({
    model: judgeModel,
    reasoning: judgeReasoning,
    schemaName: options.schemaName,
    schema: options.schema,
    system: renderPromptTemplate(promptTemplates[options.charter], {}),
    user: JSON.stringify(options.payload),
    maxTokens: judgeMaxTokens,
  })
}

// Strict-mode JSON schema building blocks shared by every stage's contract.
// Strict providers require a `type` key on every node and every property
// present, so optionals become nullable and discriminators are single-value
// enums rather than bare consts.

export const stringValue = { type: "string" }
export const nullableString = { type: ["string", "null"] }
export const stringList = { type: "array", items: { type: "string" } }
export const nullableStringList = {
  type: ["array", "null"],
  items: { type: "string" },
}

export type CitationKind = "event" | "conversation" | "effort"

// A citation schema listing exactly the source kinds this stage may cite:
// the wire contract is the first place the layering rule is stated.
export function citationListSchema(kinds: CitationKind[]) {
  return {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: [...kinds, "why"],
      properties: {
        ...Object.fromEntries(
          kinds.map((kind) => [
            kind,
            { ...nullableString, description: `${kind} id from the input.` },
          ])
        ),
        why: {
          ...nullableString,
          description: "One line: what this source shows, as read right now.",
        },
      },
    },
  }
}

export function opSchema(op: string, properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...Object.keys(properties)],
    properties: { op: { type: "string", enum: [op] }, ...properties },
  }
}

// Defensive readers for judge JSON. Strict schema output makes malformed
// entries rare; anything that still fails is counted, never thrown, so one
// bad mutation can't sink a pass.

export function readOps<Op>(
  value: Record<string, unknown>,
  readOp: (item: unknown) => Op | null
): { ops: Op[]; invalid: number } {
  const mutations = Array.isArray(value.mutations) ? value.mutations : []
  const ops: Op[] = []
  let invalid = 0

  for (const item of mutations) {
    const op = readOp(item)

    if (op === null) {
      invalid += 1
    } else {
      ops.push(op)
    }
  }

  return { ops, invalid }
}

export function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

export function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.filter((item): item is string => typeof item === "string")
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Malformed citations are dropped here; ops whose remaining citations cannot
// support them are discarded later by the applier's citation rule.
export function readCitations(value: unknown, kinds: CitationKind[]) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item): Citation[] => {
    if (!isRecord(item)) {
      return []
    }

    const why = readString(item.why)
    const present = kinds.filter((kind) => readString(item[kind]) !== undefined)

    if (present.length !== 1) {
      return []
    }

    const kind = present[0]
    const source = readString(item[kind])

    return source === undefined ? [] : [{ [kind]: source, why } as Citation]
  })
}

export function iso(timestamp: number) {
  return new Date(timestamp).toISOString()
}

// A prior journal entry as the judge sees it. The narrated date rides
// beside the text, never inside it: date-prefixed example lines teach the
// model to date its own entries, and dates are metadata here.
export type JournalRecord = { on: string; entry: string }

export function journalRecord(
  entry: Pick<Doc<"journal">, "observedAt" | "entry">
): JournalRecord {
  return { on: iso(entry.observedAt).slice(0, 10), entry: entry.entry }
}

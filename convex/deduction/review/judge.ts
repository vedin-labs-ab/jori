import {
  type PromptTemplateId,
  promptTemplates,
} from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { requestStructured } from "../../model/structured"
import { type PassInput } from "../input"
import { judgeMaxTokens, judgeModel, judgeReasoning } from "../limits"
import { type BeliefKind } from "../schema"
import { judgeOutputSchema } from "./ops"
import { readJudgeOps } from "./parse"

// The per-kind edge of the pipeline: each kind is a charter template; the
// loop around this call never branches on kind.
const charterTemplates: Record<BeliefKind, PromptTemplateId> = {
  workstream: "deduction/workstream",
}

export async function judgePass(args: { kind: BeliefKind; input: PassInput }) {
  const value = await requestStructured({
    model: judgeModel,
    reasoning: judgeReasoning,
    schemaName: "roster_mutations",
    schema: judgeOutputSchema,
    system: renderPromptTemplate(
      promptTemplates[charterTemplates[args.kind]],
      {}
    ),
    user: JSON.stringify(toJudgePayload(args.input)),
    maxTokens: judgeMaxTokens,
  })

  return readJudgeOps(value)
}

// The judge sees names, content, and ISO dates, never integration ids or raw
// timestamps: this projection keeps applier-only metadata out of the model.
export function toJudgePayload(input: PassInput) {
  return {
    window: { start: iso(input.window.start), end: iso(input.window.end) },
    beliefs: input.roster.map((entry) => ({
      id: entry.id,
      name: entry.name,
      aliases: entry.aliases,
      status: entry.status,
      brief: entry.brief,
      parentId: entry.parentId,
      anchors: entry.anchors,
      seenAt: iso(entry.seenAt),
      locked: entry.locked,
      journal: entry.journal,
    })),
    events: input.events.map((event) => ({
      id: event.id,
      type: event.type,
      text: event.text,
      actor: event.actor,
      anchor: event.anchor,
      observedAt: iso(event.observedAt),
    })),
    conversations: input.conversations.map((conversation) => ({
      id: conversation.id,
      summary: conversation.summary,
      summarizedAt: iso(conversation.summarizedAt),
    })),
  }
}

function iso(timestamp: number) {
  return new Date(timestamp).toISOString()
}

import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"

/** The summary's cap: around 1,500 tokens of content, with a little room
 *  so a summary that lands near it is not cut mid-sentence. */
export const compactionSummaryTokens = 1_600

/** The summarizer's one user message: the rows it replaces, each marked
 *  with who spoke and what the assistant called, under the fixed section
 *  layout the template asks for. */
export function compactionPrompt(messages: TranscriptMessage[]) {
  return renderPromptTemplate(promptTemplates["agent/compaction"], {
    transcript: messages.map(formatRow).join("\n\n"),
  })
}

function formatRow(message: TranscriptMessage) {
  switch (message.role) {
    case "assistant":
      return [
        "[assistant]",
        ...(message.content === null || message.content === ""
          ? []
          : [message.content]),
        ...(message.toolCalls ?? []).map(
          (call) => `(called ${call.name} with ${JSON.stringify(call.args)})`
        ),
      ].join("\n")
    case "tool":
      return `[tool result: ${message.toolName}]\n${message.content}`
    case "system":
    case "user":
      return `[${message.role}]\n${message.content}`
  }
}

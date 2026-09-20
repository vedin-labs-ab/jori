import { surfaceCommunicationTools } from "../../../contracts/runtime/surface"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { type RuntimeContext } from "../platform/types"

// A run that stops without finishing gets one instruction back: words
// outside a tool call reach no one, so say it where it lands or finish.
// The assistant's own stop text is already a transcript row.
export function stopRepairMessages(
  context: RuntimeContext
): TranscriptMessage[] {
  return [
    {
      content: stopRepairInstruction({
        visibleTools: visibleCommunicationTools(context.tools),
      }),
      role: "user",
    },
  ]
}

function hasTool(tools: RuntimeContext["tools"], name: string) {
  return tools.some((tool) => tool.name === name && tool.mode !== "blocked")
}

function stopRepairInstruction(args: { visibleTools: string[] }) {
  const instructions = [
    "The run is not finished.",
    "Any words you write outside a tool call reach no one.",
  ]

  if (args.visibleTools.length > 0) {
    instructions.push(
      visibleCommunicationInstruction(args.visibleTools),
      "If no visible communication is warranted, call `finish_run` with `reason`."
    )
  } else {
    instructions.push("Call `finish_run` when the run is done.")
  }

  return instructions.join(" ")
}

function visibleCommunicationTools(tools: RuntimeContext["tools"]) {
  return surfaceCommunicationTools.filter((tool) => hasTool(tools, tool))
}

function visibleCommunicationInstruction(tools: string[]) {
  return `Send any needed visible communication with ${toolList(tools)}. If that communication is the final useful action, set the root \`final\` field to \`true\`; otherwise call \`finish_run\` when no useful work remains.`
}

function toolList(tools: string[]) {
  return tools.map((tool) => `\`${tool}\``).join(" or ")
}

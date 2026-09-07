import { type ReplyPartKind } from "../../contracts/replies/parts"
import { type MessageSurface } from "../shared/integrations"

// What Jori's reply may carry on each surface. This table is the one place
// that says so: the reply tool's schema offers exactly these, the tool call
// is validated against them, and the surface's communication skill is read
// for the guidance that teaches them.

/** A guidance part of a communication skill: the file under the skill's
 *  `communication/` folder that teaches one way of replying. */
export type CommunicationGuidance = "interactive" | "rich" | "text"

const replyContents = {
  /** The reply's text, in the surface's own markup. */
  text: { guidance: "text" },
  /** Slack Block Kit blocks beside the text. */
  blocks: { guidance: "rich" },
  /** A card for a resource the reply is about. */
  reference: { guidance: "rich", part: "reference" },
  /** Chips or a question the requester answers with a click. */
  choices: { guidance: "interactive", part: "choices" },
} as const satisfies Record<
  string,
  { guidance: CommunicationGuidance; part?: ReplyPartKind }
>

type CommunicationCapability = keyof typeof replyContents

const surfaceCapabilities = {
  console: ["text", "reference", "choices"],
  github: ["text"],
  linear: ["text"],
  slack: ["text", "blocks"],
} as const satisfies Record<MessageSurface, readonly CommunicationCapability[]>

export function communicationCapabilities(
  surface: MessageSurface
): readonly CommunicationCapability[] {
  return surfaceCapabilities[surface]
}

/** The embedded part kinds a surface's reply admits, in schema order. */
export function replyPartKinds(surface: MessageSurface): ReplyPartKind[] {
  return communicationCapabilities(surface).flatMap((capability) => {
    const content = replyContents[capability]

    return "part" in content ? [content.part] : []
  })
}

/** The guidance parts that teach a surface's capabilities, each once, in
 *  the order the capabilities are listed. */
export function communicationGuidance(
  surface: MessageSurface
): CommunicationGuidance[] {
  const guidance = communicationCapabilities(surface).map(
    (capability) => replyContents[capability].guidance
  )

  return [...new Set(guidance)]
}

import { reactionDisplayLabel } from "../../contracts/reactions"
import { item, readString } from "./helpers"

export function reactionInputMetadata(input: Record<string, unknown>) {
  return [
    item(
      "target",
      reactionDisplayLabel(
        readString(input.reaction) ??
          readString(input.name) ??
          readString(input.content) ??
          readString(input.emoji)
      )
    ),
  ]
}

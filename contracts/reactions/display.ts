import { emojiForName, isEmojiText } from "../emoji/convert"

export function reactionDisplayLabel(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const raw = value.trim()

  if (raw === "") {
    return undefined
  }

  const emoji = emojiForName(raw)

  if (emoji !== undefined) {
    return emoji
  }

  const name = raw.replace(/^:+|:+$/g, "").toLowerCase()

  return isEmojiText(raw) ? raw : `:${name}:`
}

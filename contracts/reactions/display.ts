import { get as emojiForName, has as hasEmoji } from "node-emoji"

const reactionAliases: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  hooray: "🎉",
  laugh: "😄",
  thumbs_up: "👍",
  thumbsdown: "👎",
  thumbsup: "👍",
}

export function reactionDisplayLabel(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const raw = value.trim()

  if (raw === "") {
    return undefined
  }

  const name = raw.replace(/^:+|:+$/g, "").toLowerCase()
  const alias = reactionAliases[name]

  if (alias !== undefined) {
    return alias
  }

  return emojiForName(name) ?? (hasEmoji(raw) ? raw : `:${name}:`)
}

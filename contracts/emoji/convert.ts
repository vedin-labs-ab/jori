import emojiData from "emoji-datasource"

// GitHub reaction vocabulary that the Slack-canonical dataset lacks.
const emojiNameAliases: Record<string, string> = {
  hooray: "tada",
  laugh: "smile",
}

const emojiByName = buildEmojiIndex()

export function emojiForName(name: string) {
  const normalized = name
    .trim()
    .replace(/^:+|:+$/g, "")
    .toLowerCase()

  if (normalized === "") {
    return undefined
  }

  return emojiByName.get(emojiNameAliases[normalized] ?? normalized)
}

export function withUnicodeEmoji(text: string) {
  return text.replace(
    /:([\w+-]+):/g,
    (token, name: string) => emojiForName(name) ?? token
  )
}

export function isEmojiText(value: string) {
  return /\p{Extended_Pictographic}/u.test(value)
}

function buildEmojiIndex() {
  const index = new Map<string, string>()

  for (const entry of emojiData) {
    const emoji = emojiFromUnified(entry.unified)

    for (const name of entry.short_names) {
      index.set(name, emoji)
    }
  }

  return index
}

function emojiFromUnified(unified: string) {
  return String.fromCodePoint(
    ...unified.split("-").map((hex) => Number.parseInt(hex, 16))
  )
}

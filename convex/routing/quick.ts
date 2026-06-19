import { type MessageRoutingContext } from "./context"

const greetingReply = "Hey, what can I help with?"
const thanksReply = "Anytime."

export function quickReplyDecision(context: MessageRoutingContext) {
  if (context.activeExecution !== null || !isAddressedToMilo(context)) {
    return null
  }

  const tokens = quickReplyTokens(context.currentMessage.text)

  if (isSimpleGreeting(tokens)) {
    return { reply: greetingReply, route: "reply" as const }
  }

  if (isSimpleThanks(tokens)) {
    return { reply: thanksReply, route: "reply" as const }
  }

  return null
}

function isAddressedToMilo(context: MessageRoutingContext) {
  return context.isDirect || context.isAddressed
}

function quickReplyTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/@milo\b/g, " ")
    .replace(/<@[^>]+>/g, " mention ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "")
}

function isSimpleGreeting(tokens: string[]) {
  const greetingWords = [
    "afternoon",
    "evening",
    "hello",
    "hey",
    "hi",
    "morning",
    "yo",
  ]

  return matchesShortTokenSet(tokens, {
    allowed: [
      "afternoon",
      "evening",
      "good",
      "hello",
      "hey",
      "hi",
      "man",
      "morning",
      "my",
      "there",
      "yo",
    ],
    required: greetingWords,
  })
}

function isSimpleThanks(tokens: string[]) {
  return matchesShortTokenSet(tokens, {
    allowed: ["appreciate", "it", "thank", "thanks", "thx", "ty", "you"],
    required: ["appreciate", "thank", "thanks", "thx", "ty"],
  })
}

function matchesShortTokenSet(
  tokens: string[],
  input: {
    allowed: string[]
    required: string[]
  }
) {
  const allowed = new Set(input.allowed)
  const required = new Set(input.required)

  return (
    tokens.length > 0 &&
    tokens.length <= 4 &&
    tokens.some((token) => required.has(token)) &&
    tokens.every((token) => allowed.has(token))
  )
}

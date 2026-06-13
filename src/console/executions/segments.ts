import { hasProviderLogo } from "./logos"

export type SourceSegment =
  | {
      automation: string
      key: string
      type: "automation"
    }
  | {
      actor: string | undefined
      automation: string | undefined
      event: string
      key: string
      provider: string | undefined
      type: "event"
    }
  | {
      actor: string
      key: string
      provider: string | undefined
      type: "triggered"
    }
  | {
      actor: string
      key: string
      type: "stopped"
    }
  | {
      isEmphasized: boolean
      key: string
      label: string
      type: "part"
    }

export function sourceSegments(parts: string[]) {
  const segments: SourceSegment[] = []
  const keys = new Map<string, number>()

  for (let index = 0; index < parts.length; index += 1) {
    const matchedSegment = matchedSourceSegment(parts, index, keys)

    if (matchedSegment !== undefined) {
      segments.push(matchedSegment.segment)
      index += matchedSegment.skip
      continue
    }

    segments.push(partSourceSegment(parts, index, keys))
  }

  return segments
}

type SourceSegmentMatch = {
  segment: SourceSegment
  skip: number
}

function matchedSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  return (
    eventSourceSegment(parts, index, keys) ??
    automationSourceSegment(parts, index, keys) ??
    triggeredSourceSegment(parts, index, keys) ??
    stoppedSourceSegment(parts[index], keys)
  )
}

function eventSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (parts[index] !== "Triggered by event:") {
    return undefined
  }

  let cursor = index + 1
  let actor: string | undefined
  let provider: string | undefined

  if (parts[cursor + 1] === "in") {
    actor = parts[cursor]
    provider = parts[cursor + 2]
    cursor += 3
  } else if (parts[cursor + 1] === "event:") {
    provider = parts[cursor]
    cursor += 1
  }

  const event =
    parts[cursor] === "event:" ? (parts[cursor + 1] ?? "Provider event") : ""

  if (event === "") {
    return undefined
  }

  cursor += 2

  const automation =
    parts[cursor] === "for automation:" ? parts[cursor + 1] : undefined

  if (automation !== undefined) {
    cursor += 2
  }

  return {
    segment: {
      actor,
      automation,
      event,
      key: sourceSegmentKey(
        keys,
        `event-${actor ?? ""}-${provider ?? ""}-${event}-${automation ?? ""}`
      ),
      provider,
      type: "event",
    },
    skip: cursor - index - 1,
  }
}

function automationSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (parts[index] !== "Triggered by automation:") {
    return undefined
  }

  const automation = parts[index + 1]

  if (automation === undefined || automation === "") {
    return undefined
  }

  return {
    segment: {
      automation,
      key: sourceSegmentKey(keys, `automation-${automation}`),
      type: "automation",
    },
    skip: 1,
  }
}

function triggeredSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (parts[index] !== "Triggered by" || parts[index + 2] !== "in") {
    return undefined
  }

  const actor = parts[index + 1] ?? "someone"
  const providerCandidate = parts[index + 3]
  const provider = providerCandidate?.startsWith("Stopped by ")
    ? undefined
    : providerCandidate

  return {
    segment: {
      actor,
      key: sourceSegmentKey(keys, `triggered-${actor}-${provider ?? ""}`),
      provider,
      type: "triggered",
    },
    skip: provider === undefined ? 2 : 3,
  }
}

function stoppedSourceSegment(
  part: string,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (!part.startsWith("Stopped by ")) {
    return undefined
  }

  const actor = part.slice("Stopped by ".length)

  return {
    segment: {
      actor,
      key: sourceSegmentKey(keys, `stopped-${actor}`),
      type: "stopped",
    },
    skip: 0,
  }
}

function partSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegment {
  const part = parts[index]

  return {
    isEmphasized: isEmphasizedSourcePart(parts, index),
    key: sourceSegmentKey(keys, `part-${part}`),
    label: part,
    type: "part",
  }
}

function sourceSegmentKey(keys: Map<string, number>, key: string) {
  const count = keys.get(key) ?? 0
  keys.set(key, count + 1)

  return count === 0 ? key : `${key}-${count}`
}

function isEmphasizedSourcePart(parts: string[], index: number) {
  const label = parts[index]

  return (
    hasProviderLogo(label) ||
    (parts[index - 1] === "Triggered by" && parts[index + 1] === "in")
  )
}

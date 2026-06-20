import { type Doc } from "../../_generated/dataModel"

type RunSnapshot = Doc<"runs">["snapshot"]
type RunSnapshotInput = Omit<RunSnapshot, "title">

export function automationDisplay(
  overrides: Partial<RunSnapshotInput> = {}
): RunSnapshotInput {
  return {
    source: {
      type: "automation",
    },
    context: [],
    ...overrides,
  }
}

export function eventAutomationDisplay(input: {
  context?: RunSnapshot["context"]
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
  url?: string
}): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: input.surface,
      ...(input.url === undefined ? {} : { url: input.url }),
    },
    context: input.context ?? [],
  })
}

export function messageDisplay(input: {
  context?: RunSnapshot["context"]
  kind: "mention" | "reply"
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
  url?: string
}): RunSnapshotInput {
  const surface = input.surface ?? "slack"

  return {
    source: {
      type: "message",
      surface,
      ...(input.url === undefined ? {} : { url: input.url }),
    },
    context: input.context ?? [],
  }
}

export function oneShotDisplay(): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: "milo",
    },
  })
}

export function recurringDisplay(input: {
  context?: RunSnapshot["context"]
  schedule?: string
}): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: "milo",
    },
    context: [
      { type: "schedule", label: input.schedule ?? "Daily at 09:00 UTC" },
      ...(input.context ?? []),
    ],
  })
}

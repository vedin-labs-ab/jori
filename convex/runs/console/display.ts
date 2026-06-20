import { type Doc } from "../../_generated/dataModel"

type RunSnapshot = Doc<"runs">["snapshot"]
type RunSnapshotInput = Omit<RunSnapshot, "title">

export function automationDisplay(
  overrides: Partial<RunSnapshotInput> = {}
): RunSnapshotInput {
  return {
    source: {
      type: "automation",
      metadata: [],
    },
    trigger: "Time automation",
    details: [],
    ...overrides,
  }
}

export function eventAutomationDisplay(input: {
  details?: RunSnapshot["details"]
  event?: NonNullable<RunSnapshot["source"]["event"]>
  metadata?: RunSnapshot["source"]["metadata"]
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
}): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: input.surface,
      event: input.event,
      metadata: input.metadata ?? [],
    },
    trigger:
      input.surface === undefined
        ? "Event automation"
        : `${input.surface.label} event`,
    details: input.details ?? [],
  })
}

export function messageDisplay(input: {
  details?: RunSnapshot["details"]
  kind: "mention" | "reply"
  metadata?: RunSnapshot["source"]["metadata"]
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
  taskSource?: RunSnapshot["taskSource"]
}): RunSnapshotInput {
  const surface = input.surface ?? { type: "slack", label: "Slack" }

  return {
    source: {
      type: "message",
      kind: { type: input.kind, label: input.kind },
      surface,
      metadata: input.metadata ?? [],
    },
    trigger: `${surface.label} message`,
    details: input.details ?? [],
    ...(input.taskSource === undefined ? {} : { taskSource: input.taskSource }),
  }
}

export function oneShotDisplay(): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: { type: "milo", label: "Milo" },
      kind: { type: "one-shot", label: "one-shot" },
      metadata: [],
    },
  })
}

export function recurringDisplay(input: {
  details?: RunSnapshot["details"]
  schedule?: string
}): RunSnapshotInput {
  return automationDisplay({
    source: {
      type: "automation",
      surface: { type: "milo", label: "Milo" },
      kind: { type: "recurring", label: "recurring" },
      metadata: [
        { type: "schedule", label: input.schedule ?? "Daily at 09:00 UTC" },
      ],
    },
    details: input.details ?? [],
  })
}

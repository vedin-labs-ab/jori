import { type Doc } from "../../../_generated/dataModel"

type RunDisplay = Doc<"runs">["display"]

export function automationDisplay(
  overrides: Partial<RunDisplay> = {}
): RunDisplay {
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
  details?: RunDisplay["details"]
  event?: NonNullable<RunDisplay["source"]["event"]>
  metadata?: RunDisplay["source"]["metadata"]
  provider?: NonNullable<RunDisplay["source"]["provider"]>
}): RunDisplay {
  return automationDisplay({
    source: {
      type: "automation",
      provider: input.provider,
      event: input.event,
      metadata: input.metadata ?? [],
    },
    trigger:
      input.provider === undefined
        ? "Event automation"
        : `${input.provider.label} event`,
    details: input.details ?? [],
  })
}

export function messageDisplay(input: {
  details?: RunDisplay["details"]
  kind: "mention" | "reply"
  metadata?: RunDisplay["source"]["metadata"]
  provider?: NonNullable<RunDisplay["source"]["provider"]>
  taskSource?: RunDisplay["taskSource"]
}): RunDisplay {
  const provider = input.provider ?? { type: "slack", label: "Slack" }

  return {
    source: {
      type: "message",
      kind: { type: input.kind, label: input.kind },
      provider,
      metadata: input.metadata ?? [],
    },
    trigger: `${provider.label} message`,
    details: input.details ?? [],
    ...(input.taskSource === undefined ? {} : { taskSource: input.taskSource }),
  }
}

export function oneShotDisplay(): RunDisplay {
  return automationDisplay({
    source: {
      type: "automation",
      provider: { type: "milo", label: "Milo" },
      kind: { type: "one-shot", label: "one-shot" },
      metadata: [],
    },
  })
}

export function recurringDisplay(input: {
  details?: RunDisplay["details"]
  schedule?: string
}): RunDisplay {
  return automationDisplay({
    source: {
      type: "automation",
      provider: { type: "milo", label: "Milo" },
      kind: { type: "recurring", label: "recurring" },
      metadata: [
        { type: "schedule", label: input.schedule ?? "Daily at 09:00 UTC" },
      ],
    },
    details: input.details ?? [],
  })
}

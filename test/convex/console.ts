import { type MessageCauseKind } from "../../convex/runs/schema"

type ActivityData = import("../../convex/runs/activity/types").ActivityData
type QueryCtx = import("../../convex/_generated/server").QueryCtx
type RunSnapshot =
  import("../../convex/_generated/dataModel").Doc<"runs">["snapshot"]
type RunSnapshotInput = Omit<RunSnapshot, "title">

/** Activity projection input with every relation empty; callers add the
 *  run and whatever the test exercises. */
export function emptyActivityData(): Omit<ActivityData, "run"> {
  return {
    agents: [],
    approvals: [],
    collections: [],
    files: [],
    offers: [],
    traces: [],
    waiters: [],
  }
}

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
  kind: MessageCauseKind
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
      surface: "jori",
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
      surface: "jori",
    },
    context: [
      { type: "schedule", label: input.schedule ?? "Daily at 09:00 UTC" },
      ...(input.context ?? []),
    ],
  })
}

export function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: () => ({
        withIndex: () => emptyQueryResult(),
      }),
    },
  } as unknown as QueryCtx
}

export function emptyQueryResult() {
  return {
    async *[Symbol.asyncIterator]() {},
    first: async () => null,
    order: () => emptyQueryResult(),
    take: async () => [],
  }
}

import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { requestJudge } from "../engine/judge"
import {
  type EffortContext,
  type EffortPassInput,
  toPayload,
  type WindowEvent,
} from "./input"
import { effortOutputSchema } from "./ops"
import { readEffortOps } from "./parse"

// Live behavioral probes for the effort charter: golden scenarios run
// against the real judge model. Skipped unless DEDUCTION_PROBES=1 (needs
// OPENROUTER_API_KEY); rerun these whenever the charter changes. Loose
// assertions on op shapes, never on wording: model behavior varies.
const enabled =
  process.env.DEDUCTION_PROBES === "1" &&
  process.env.OPENROUTER_API_KEY !== undefined
const probe = test.skipIf(!enabled)
const timeout = 180_000

probe(
  "distinct deliverables in one window become distinct efforts",
  async () => {
    const { ops } = await judgeEfforts(
      passInput({
        events: [
          windowEvent({
            id: "e1",
            text: "1 commit pushed to main in acme/app (src): Add SSO login callback and session exchange",
          }),
          windowEvent({
            id: "e2",
            text: "1 commit pushed to main in acme/app (src): Fix CSV export dropping header row on empty filters",
          }),
        ],
      })
    )

    expect(
      ops.filter((op) => op.op === "create").length
    ).toBeGreaterThanOrEqual(2)
  },
  timeout
)

probe(
  "continuing work extends the existing effort instead of duplicating",
  async () => {
    const { ops } = await judgeEfforts(
      passInput({
        efforts: [
          effortContext({
            id: "f1",
            name: "SSO login",
            summary: "Adding single sign-on to the app login flow.",
            journal: [
              { on: "2026-07-04", entry: "Added the SSO login callback." },
            ],
          }),
        ],
        events: [
          windowEvent({
            id: "e1",
            text: "1 commit pushed to main in acme/app (src): Refresh SSO session tokens before expiry",
          }),
        ],
      })
    )

    expect(ops.filter((op) => op.op === "create")).toHaveLength(0)
  },
  timeout
)

async function judgeEfforts(input: EffortPassInput) {
  return readEffortOps(
    await requestJudge({
      charter: "deduction/effort",
      schemaName: "effort_mutations",
      schema: effortOutputSchema,
      payload: toPayload(input),
    })
  )
}

function passInput(overrides: Partial<EffortPassInput>): EffortPassInput {
  return {
    window: {
      start: Date.UTC(2026, 6, 5, 11),
      end: Date.UTC(2026, 6, 5, 12),
    },
    efforts: [],
    events: [],
    conversations: [],
    ...overrides,
  }
}

function effortContext(
  overrides: Omit<Partial<EffortContext>, "id"> & { id: string }
): EffortContext {
  return {
    name: "Effort",
    summary: "An effort.",
    anchors: ["github:repository:acme/app"],
    actors: ["dana"],
    seenAt: Date.UTC(2026, 6, 4),
    journal: [],
    ...overrides,
    id: overrides.id as Id<"efforts">,
  }
}

function windowEvent(
  overrides: Omit<Partial<WindowEvent>, "id"> & { id: string }
): WindowEvent {
  return {
    type: "commits.pushed",
    actor: "dana",
    anchor: "github:repository:acme/app",
    observedAt: Date.UTC(2026, 6, 5, 11, 30),
    ...overrides,
    id: overrides.id as Id<"events">,
    integrationId: "integration-1" as Id<"integrations">,
  }
}

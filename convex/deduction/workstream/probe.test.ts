import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { requestJudge } from "../engine/judge"
import {
  type EffortEntry,
  type RosterEntry,
  toPayload,
  type WorkstreamPassInput,
} from "./input"
import { workstreamOutputSchema } from "./ops"
import { readWorkstreamOps } from "./parse"

// Live behavioral probes for the workstream charters. Skipped unless
// DEDUCTION_PROBES=1 (needs OPENROUTER_API_KEY); rerun on every charter
// change. Loose assertions on op shapes, never on wording.
const enabled =
  process.env.DEDUCTION_PROBES === "1" &&
  process.env.OPENROUTER_API_KEY !== undefined
const probe = test.skipIf(!enabled)
const timeout = 180_000

probe(
  "a changed effort matching known work is assigned, not duplicated",
  async () => {
    const value = await judgeWorkstreams(
      passInput({
        scope: "window",
        roster: [
          rosterEntry({
            id: "b1",
            name: "Payments revamp",
            brief: "Rebuild of the payments flow.",
            anchors: ["linear:project:p1"],
            members: ["Cutover checklist"],
          }),
        ],
        efforts: [
          effortEntry({
            id: "f1",
            name: "Payments v2 cutover",
            summary: "Cutting merchants over to the payments v2 flow.",
            anchors: ["linear:project:p1"],
          }),
        ],
      })
    )
    const { ops } = readWorkstreamOps(value)

    expect(ops.filter((op) => op.op === "create")).toHaveLength(0)
    expect(ops.some((op) => op.op === "assign" && op.beliefId === "b1")).toBe(
      true
    )
  },
  timeout
)

probe(
  "consolidation splits a catch-all into the bodies of work",
  async () => {
    const catchAll = rosterEntry({
      id: "b1",
      name: "Platform work",
      brief:
        "Platform work covering the payments rebuild and the onboarding redesign.",
      anchors: ["github:repository:acme/app"],
      members: [
        "Payments v2 cutover",
        "Refund reconciliation",
        "Onboarding checklist redesign",
        "Signup email verification",
      ],
    })
    const members = [
      effortEntry({
        id: "f1",
        name: "Payments v2 cutover",
        summary: "Cutting merchants over to the payments v2 flow.",
        workstreamId: "b1",
      }),
      effortEntry({
        id: "f2",
        name: "Refund reconciliation",
        summary: "Reconciling refunds between ledger and processor.",
        workstreamId: "b1",
      }),
      effortEntry({
        id: "f3",
        name: "Onboarding checklist redesign",
        summary: "Redesigning the new-customer onboarding checklist.",
        workstreamId: "b1",
      }),
      effortEntry({
        id: "f4",
        name: "Signup email verification",
        summary: "Verifying emails during onboarding signup.",
        workstreamId: "b1",
      }),
    ]
    const value = await judgeWorkstreams(
      passInput({ scope: "full", roster: [catchAll], efforts: members })
    )
    const bodies = Array.isArray(value.bodiesOfWork) ? value.bodiesOfWork : []
    const { ops } = readWorkstreamOps(value)
    const creates = ops.filter((op) => op.op === "create")

    expect(bodies.length).toBeGreaterThanOrEqual(2)
    expect(creates.length).toBeGreaterThanOrEqual(1)
    expect(creates.every((op) => !/^[a-z]/.test(op.name))).toBe(true)
    expect(
      creates.every((op) =>
        op.citations.some((citation) => "effort" in citation)
      )
    ).toBe(true)
  },
  timeout
)

async function judgeWorkstreams(input: WorkstreamPassInput) {
  return await requestJudge({
    charter:
      input.scope === "window"
        ? "deduction/workstream"
        : "deduction/consolidation",
    schemaName: "workstream_mutations",
    schema: workstreamOutputSchema(input.scope),
    payload: toPayload(input),
  })
}

function passInput(
  overrides: Partial<WorkstreamPassInput>
): WorkstreamPassInput {
  return {
    window: {
      start: Date.UTC(2026, 6, 5, 11),
      end: Date.UTC(2026, 6, 5, 12),
    },
    scope: "window",
    roster: [],
    efforts: [],
    ...overrides,
  }
}

function rosterEntry(
  overrides: Omit<Partial<RosterEntry>, "id"> & { id: string }
): RosterEntry {
  return {
    name: "Workstream",
    aliases: [],
    status: "confirmed",
    brief: "A workstream.",
    anchors: [],
    seenAt: Date.UTC(2026, 6, 4),
    locked: false,
    members: [],
    ...overrides,
    id: overrides.id as Id<"beliefs">,
  }
}

function effortEntry(
  overrides: Omit<Partial<EffortEntry>, "id" | "workstreamId"> & {
    id: string
    workstreamId?: string
  }
): EffortEntry {
  return {
    name: "Effort",
    summary: "An effort.",
    anchors: ["github:repository:acme/app"],
    actors: ["dana"],
    seenAt: Date.UTC(2026, 6, 5, 11, 30),
    journal: [],
    ...overrides,
    id: overrides.id as Id<"efforts">,
    workstreamId: overrides.workstreamId as Id<"beliefs"> | undefined,
  }
}

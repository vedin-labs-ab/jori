import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type PassInput, type RosterEntry, type WindowEvent } from "./input"
import { judgePass } from "./review/judge"

// Live behavioral probes for the workstream charter: golden scenarios run
// against the real judge model. Skipped unless DEDUCTION_PROBES=1 (needs
// OPENROUTER_API_KEY); rerun these whenever the charter changes. Loose
// assertions on op shapes, never on wording: model behavior varies.
const enabled =
  process.env.DEDUCTION_PROBES === "1" &&
  process.env.OPENROUTER_API_KEY !== undefined
const probe = test.skipIf(!enabled)
const timeout = 180_000

probe(
  "a renamed mention of known work updates instead of duplicating",
  async () => {
    const { ops } = await judgePass({
      kind: "workstream",
      input: passInput({
        roster: [
          rosterEntry({
            name: "Payments revamp",
            aliases: ["payments v2"],
            anchors: ["linear-project:p1"],
          }),
        ],
        events: [
          windowEvent({
            id: "e1",
            type: "issue.created",
            text: "Linear issue ENG-40 created: Ship the payments v2 cutover (project: Payments revamp)",
            anchor: "linear-project:p1",
          }),
        ],
      }),
    })

    expect(ops.filter((op) => op.op === "create")).toHaveLength(0)
  },
  timeout
)

probe(
  "a project and its issues yield one workstream, not one per issue",
  async () => {
    const { ops } = await judgePass({
      kind: "workstream",
      input: passInput({
        events: [
          windowEvent({
            id: "e1",
            type: "project.created",
            text: "Linear project Payments revamp created",
            anchor: "linear-project:p1",
          }),
          windowEvent({
            id: "e2",
            type: "issue.created",
            text: "Linear issue ENG-41 created: Cutover plan (project: Payments revamp)",
            anchor: "linear-project:p1",
          }),
          windowEvent({
            id: "e3",
            type: "issue.created",
            text: "Linear issue ENG-42 created: Routing skeleton (project: Payments revamp)",
            anchor: "linear-project:p1",
          }),
          windowEvent({
            id: "e4",
            type: "issue.created",
            text: "Linear issue ENG-43 created: Ledger backfill (project: Payments revamp)",
            anchor: "linear-project:p1",
          }),
        ],
      }),
    })

    expect(ops.filter((op) => op.op === "create")).toHaveLength(1)
  },
  timeout
)

probe(
  "anchors outweigh name similarity when attributing activity",
  async () => {
    const payments = rosterEntry({
      name: "Payments revamp",
      anchors: ["linear-project:p1"],
    })
    const platform = rosterEntry({
      id: "belief-2",
      name: "Data platform",
      brief: "Warehouse and ingestion infrastructure.",
      anchors: ["github:acme/data"],
    })
    const { ops } = await judgePass({
      kind: "workstream",
      input: passInput({
        roster: [payments, platform],
        events: [
          windowEvent({
            id: "e1",
            type: "commits.pushed",
            text: "2 commits pushed to main in acme/data (ingestion): Add payments ingestion tables; Backfill payments rows",
            anchor: "github:acme/data",
          }),
        ],
      }),
    })
    const journalTargets = ops.flatMap((op) =>
      op.op === "journal" ? [op.beliefId] : []
    )

    expect(ops.filter((op) => op.op === "create")).toHaveLength(0)
    expect(journalTargets).not.toContain(payments.id)
  },
  timeout
)

function passInput(args: {
  roster?: RosterEntry[]
  events?: WindowEvent[]
}): PassInput {
  return {
    window: { start: Date.UTC(2026, 6, 1), end: Date.UTC(2026, 6, 2) },
    roster: args.roster ?? [],
    events: args.events ?? [],
    conversations: [],
  }
}

type Loose<Entry> = Omit<Partial<Entry>, "id"> & { id?: string }

function rosterEntry(entry: Loose<RosterEntry> & { name: string }) {
  return {
    aliases: [],
    status: "confirmed" as const,
    brief: "Rebuilding the payments flow.",
    anchors: [],
    seenAt: Date.UTC(2026, 5, 28),
    locked: false,
    journal: [],
    ...entry,
    id: (entry.id ?? "belief-1") as Id<"beliefs">,
  }
}

function windowEvent(event: Loose<WindowEvent> & { id: string }) {
  return {
    integrationId: "integration-1" as Id<"integrations">,
    type: "issue.created",
    observedAt: Date.UTC(2026, 6, 1, 10),
    ...event,
    id: event.id as Id<"events">,
  }
}

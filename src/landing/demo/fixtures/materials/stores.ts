import { type JsonSchemaObject } from "@contracts/schema/validate"
import { day, hour } from "../clock"
import { folderId } from "../folders"
import { demoId } from "../ids"
import { type DemoStore } from "../types"

/** The state Copperline's jobs carry between runs: what the release job
 *  knows about the rollout, and what the renewals job is watching. Both
 *  sit under a plain-shape schema, so the form edits the value and the
 *  builder edits the schema. */
export function demoStores(now: number): DemoStore[] {
  return [
    {
      ...store(now, "release", "Release state", "engineering", 37),
      updatedAt: now - 3 * day,
      schema: releaseSchema,
      value: {
        version: "2.14",
        stage: "rollout",
        rolloutPercent: 25,
        frozen: false,
        blockers: ["Checkout latency regression"],
      },
    },
    {
      ...store(now, "watch", "Renewals watch state", "renewals", 61),
      updatedAt: now - 5 * hour,
      schema: watchSchema,
      value: {
        lastCheckedAt: "2026-09-02T06:00:00Z",
        windowDays: 45,
        flagged: ["Harbor House", "Larkspur Hotels"],
        nudgesSent: 12,
      },
    },
  ]
}

const releaseSchema: JsonSchemaObject = {
  type: "object",
  properties: {
    version: { type: "string" },
    stage: { type: "string" },
    rolloutPercent: { type: "integer" },
    frozen: { type: "boolean" },
    blockers: { type: "array", items: { type: "string" } },
  },
  required: ["version", "stage", "rolloutPercent", "frozen"],
}

const watchSchema: JsonSchemaObject = {
  type: "object",
  properties: {
    lastCheckedAt: { type: "string" },
    windowDays: { type: "integer" },
    flagged: { type: "array", items: { type: "string" } },
    nudgesSent: { type: "integer" },
  },
  required: ["lastCheckedAt", "windowDays", "flagged"],
}

function store(
  now: number,
  key: string,
  name: string,
  folder: string,
  version: number
) {
  return {
    kind: "store" as const,
    id: demoId("collections", key),
    name,
    description: "What the job carries between runs.",
    folderId: folderId(folder),
    visibility: { mode: "organization" as const },
    createdAt: now - 25 * day,
    version,
  }
}

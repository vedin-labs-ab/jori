import { type BillingOverview } from "./actions"

type BillingEntry = BillingOverview["entries"][number]

export type ActivityKind = "run" | "allowance" | "top-up" | "refund"

export type ActivityRow = {
  id: string
  timestamp: number
  kind: ActivityKind
  label: string
  runId: string | undefined
  dot: string | undefined
  signedMicros: number
  balanceMicros: number
}

export const kindLabels: Record<ActivityKind, string> = {
  run: "Runs",
  allowance: "Allowances",
  "top-up": "Top-ups",
  refund: "Refunds",
}

const entryKinds: Record<BillingEntry["type"], ActivityKind> = {
  debit: "run",
  allowance: "allowance",
  topup: "top-up",
  refund: "refund",
}

export function toRow(entry: BillingEntry): ActivityRow {
  return {
    id: entry._id,
    timestamp: entry.timestamp,
    kind: entryKinds[entry.type],
    label: entryLabel(entry),
    runId: entry.type === "debit" ? entry.runId : undefined,
    dot: entryDot(entry),
    signedMicros:
      entry.type === "debit" || entry.type === "refund"
        ? -entry.micros.amount
        : entry.micros.amount,
    balanceMicros: entry.micros.balance,
  }
}

function entryLabel(entry: BillingEntry) {
  if (entry.type === "debit") {
    return entry.runTitle ?? "Run"
  }

  if (entry.type === "topup") {
    return entry.auto ? "Auto top-up" : "Top-up"
  }
  if (entry.type === "refund") {
    return "Top-up refund"
  }

  return entry.source === "manual" ? "Manual allowance" : "Monthly allowance"
}

function entryDot(entry: BillingEntry) {
  if (entry.type === "allowance") {
    return "bg-primary"
  }

  return entry.type === "topup" ? "bg-informational" : undefined
}

import { formatUsd } from "@contracts/billing"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { absoluteTime } from "../shared/time"
import { type BillingOverview } from "./actions"

type BillingEntry = BillingOverview["entries"][number]

/**
 * The statement: every allowance, top-up, and run, with the pot it touched
 * and the balance it left behind. Older rows written before attribution
 * existed simply omit those columns.
 */
export function Activity({ entries }: { entries: BillingEntry[] }) {
  return (
    <section>
      <h2 className="font-medium">Activity</h2>
      <p className="mt-0.5 text-muted-foreground text-sm">
        Every allowance, top-up, and run, priced at provider list rates.
      </p>
      {entries.length === 0 ? (
        <p className="mt-4 text-muted-foreground text-sm">
          Nothing yet. Costs appear here as Milo works.
        </p>
      ) : (
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry._id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {absoluteTime(entry.timestamp)}
                </TableCell>
                <TableCell>{entryLabel(entry)}</TableCell>
                <TableCell>
                  <SourceChip entry={entry} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entryAmount(entry)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {entry.balanceMicros === undefined
                    ? ""
                    : formatUsd(entry.balanceMicros)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function SourceChip({ entry }: { entry: BillingEntry }) {
  const source = entrySource(entry)

  if (source === null) {
    return null
  }

  return (
    <Badge variant={source === "Wallet" ? "outline" : "secondary"}>
      {source}
    </Badge>
  )
}

function entrySource(entry: BillingEntry) {
  if (entry.type === "grant") {
    return "Included"
  }

  if (entry.type === "topup") {
    return "Wallet"
  }

  if (entry.includedMicros === undefined) {
    return null
  }

  if (entry.includedMicros >= entry.amountMicros) {
    return "Included"
  }

  return entry.includedMicros === 0 ? "Wallet" : "Included + Wallet"
}

function entryLabel(entry: BillingEntry) {
  if (entry.type === "debit") {
    return entry.runTitle ?? "Run"
  }

  if (entry.type === "topup") {
    return entry.auto ? "Auto top-up" : "Wallet top-up"
  }

  return entry.source === "trial" ? "Trial allowance" : "Monthly allowance"
}

function entryAmount(entry: BillingEntry) {
  return entry.type === "debit"
    ? formatUsd(-entry.amountMicros)
    : `+${formatUsd(entry.amountMicros)}`
}

import { formatUsd } from "@contracts/billing"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export function ActivityCard({ entries }: { entries: BillingEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Every grant, top-up, and run, priced at provider list rates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing yet. Costs appear here as Milo works.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {absoluteTime(entry.timestamp)}
                  </TableCell>
                  <TableCell>{entryLabel(entry)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entryAmount(entry)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function entryLabel(entry: BillingEntry) {
  if (entry.type === "debit") {
    return entry.runTitle ?? "Run"
  }

  if (entry.type === "topup") {
    return entry.auto ? "Auto top-up" : "Wallet top-up"
  }

  if (entry.source === "trial") {
    return "Trial usage included"
  }

  return `Included usage${entry.source === "cycle" ? " reset" : ""}`
}

function entryAmount(entry: BillingEntry) {
  return entry.type === "debit"
    ? formatUsd(-entry.amountMicros)
    : `+${formatUsd(entry.amountMicros)}`
}

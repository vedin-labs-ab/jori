import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { countLabel } from "@/lib/count"
import { type TableColumn } from "../types"
import { type CsvPlan, planCsvImport } from "./csv"

const shownIssueLimit = 8

/** Import rows from a CSV file: the file is parsed and validated in full
 *  before the import starts, so a running import can only fail on the
 *  table changing underneath it, never on a bad row. */
export function ImportRowsDialog({
  columns,
  isOpen,
  onImport,
  onOpenChange,
}: {
  columns: TableColumn[]
  isOpen: boolean
  onImport: (rows: Record<string, unknown>[]) => Promise<boolean>
  onOpenChange: (isOpen: boolean) => void
}) {
  const [plan, setPlan] = useState<CsvPlan>()
  const [isImporting, setIsImporting] = useState(false)

  function close(open: boolean) {
    if (!isImporting) {
      setPlan(undefined)
      onOpenChange(open)
    }
  }

  async function readFile(file: File) {
    setPlan(planCsvImport(columns, await file.text()))
  }

  async function submit() {
    if (plan?.status !== "ready") {
      return
    }

    setIsImporting(true)

    if (await onImport(plan.rows)) {
      toast.success(`Imported ${countLabel(plan.rows.length, "row")}.`)
      setPlan(undefined)
      onOpenChange(false)
    }

    setIsImporting(false)
  }

  return (
    <Dialog onOpenChange={close} open={isOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import rows</DialogTitle>
          <DialogDescription>
            Pick a CSV file whose header row matches this table's column keys or
            names. Every row is checked before anything is imported.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="table-import-file">CSV file</Label>
          <Input
            accept=".csv,text/csv"
            id="table-import-file"
            // Clearing on click lets re-picking the same file (after fixing
            // it) fire the change event again.
            onClick={(event) => {
              event.currentTarget.value = ""
            }}
            onChange={(event) => {
              const file = event.target.files?.item(0)

              if (file != null) {
                void readFile(file)
              }
            }}
            type="file"
          />
        </div>
        <ImportPlanSummary plan={plan} />
        <DialogFooter>
          <Button
            disabled={plan?.status !== "ready" || isImporting}
            onClick={() => void submit()}
            type="button"
          >
            {isImporting ? <Loader2 className="animate-spin" /> : null}
            {plan?.status === "ready"
              ? `Import ${countLabel(plan.rows.length, "row")}`
              : "Import rows"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportPlanSummary({ plan }: { plan: CsvPlan | undefined }) {
  if (plan === undefined) {
    return null
  }

  if (plan.status === "error") {
    return <p className="text-destructive text-xs">{plan.message}</p>
  }

  if (plan.status === "ready") {
    return (
      <p className="text-muted-foreground text-xs">
        {countLabel(plan.rows.length, "row")} ready to import.
      </p>
    )
  }

  return (
    <div className="grid gap-1">
      <p className="text-destructive text-xs">
        {plan.issues.length} of {countLabel(plan.total, "row")} cannot be
        imported. Fix the file and pick it again; nothing has been imported.
      </p>
      <ul className="grid list-disc gap-0.5 pl-4 text-destructive text-xs">
        {plan.issues.slice(0, shownIssueLimit).map((issue) => (
          <li key={`${issue.line}-${issue.message}`}>
            Line {issue.line}: {issue.message}
          </li>
        ))}
      </ul>
      {plan.issues.length > shownIssueLimit ? (
        <p className="text-destructive text-xs">
          …and {plan.issues.length - shownIssueLimit} more.
        </p>
      ) : null}
    </div>
  )
}

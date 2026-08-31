import { isRecord } from "@contracts/json"
import { type Visibility } from "@contracts/visibility"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
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
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { countLabel } from "@/console/shared/count"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { MaterialNameField } from "../../shared/materials/fields"
import { DialogForm } from "../../shared/materials/form"
import { VisibilityField } from "../../shared/visibility/field"
import { type CsvTablePlan, deriveTableName, planCsvTable } from "./infer"
import { ImportTablePreview } from "./preview"

/** Import a CSV file as a brand-new table: the schema is deduced from the
 *  data and every row is validated up front, so an import either starts
 *  with a clean file or does not start at all. */
export function ImportTableDialog({
  isOpen,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useImportTable(organizationId, () => onOpenChange(false))

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!form.isImporting) {
          form.reset()
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import table</DialogTitle>
          <DialogDescription>
            Pick a CSV file. Its columns are deduced from the data and a new
            table is created holding every row.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.plan?.status !== "ready" || form.isImporting}
          onSubmit={() => void form.submit()}
        >
          <ImportTableFields form={form} organizationId={organizationId} />
          <DialogFooter>
            <Button
              disabled={form.plan?.status !== "ready" || form.isImporting}
              type="submit"
            >
              {form.isImporting ? <Loader2 className="animate-spin" /> : null}
              {form.plan?.status === "ready"
                ? `Import ${countLabel(form.plan.rows.length, "row")}`
                : "Import table"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function ImportTableFields({
  form,
  organizationId,
}: {
  form: ReturnType<typeof useImportTable>
  organizationId: string
}) {
  return (
    <div className="grid gap-4">
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
              void form.readFile(file)
            }
          }}
          type="file"
        />
      </div>
      {/* Parsing resolves well after the file is chosen, so focus is still on
          the input when this arrives. Without the live region the dialog just
          silently refuses to go on. */}
      {form.plan?.status === "error" ? (
        <FieldError>{form.plan.message}</FieldError>
      ) : null}
      {form.plan !== undefined && form.plan.status !== "error" ? (
        <>
          <MaterialNameField
            error={form.nameError}
            idPrefix="table-import"
            name={form.name}
            onNameChange={form.setName}
          />
          <VisibilityField
            id="table-import-visibility"
            noun="table"
            onChange={form.setVisibility}
            organizationId={organizationId}
            value={form.visibility}
          />
          <ImportTablePreview plan={form.plan} />
        </>
      ) : null}
    </div>
  )
}

function useImportTable(organizationId: string, onImported: () => void) {
  const navigate = useNavigate()
  const create = useMutation(api.tables.console.create)
  const insertBatch = useMutation(api.tables.console.insertRows)
  const [plan, setPlan] = useState<CsvTablePlan>()
  const [name, setName] = useState("")
  const [visibility, setVisibility] = useState<Visibility>({
    mode: "organization",
  })
  const [nameError, setNameError] = useState<string>()
  const [isImporting, setIsImporting] = useState(false)

  function reset() {
    setPlan(undefined)
    setName("")
    setVisibility({ mode: "organization" })
    setNameError(undefined)
  }

  async function submit() {
    if (plan?.status !== "ready") {
      return
    }

    if (name.trim() === "") {
      setNameError("Give the table a name.")

      return
    }

    setIsImporting(true)

    const tableId = await runImport({
      create,
      insertBatch,
      name,
      organizationId,
      plan,
      visibility,
    })

    setIsImporting(false)

    if (tableId !== undefined) {
      reset()
      onImported()
      void navigate({ to: "/tables/$tableId", params: { tableId } })
    }
  }

  return {
    isImporting,
    name,
    nameError,
    plan,
    reset,
    visibility,
    async readFile(file: File) {
      setPlan(planCsvTable(await file.text()))
      setName(deriveTableName(file.name))
      setNameError(undefined)
    },
    // Validation shows only after a submit attempt; new input in the name
    // field clears its error right away.
    setName(next: string) {
      setNameError(undefined)
      setName(next)
    },
    setVisibility,
    submit,
  }
}

/** Create the table, then insert the validated rows in sequential batches.
 *  Returns the new table's id, or undefined after toasting the failure. */
async function runImport({
  create,
  insertBatch,
  name,
  organizationId,
  plan,
  visibility,
}: {
  create: (
    args: FunctionArgs<typeof api.tables.console.create>
  ) => Promise<unknown>
  insertBatch: (args: {
    organizationId: string
    tableId: GenericId<"collections">
    rows: Record<string, unknown>[]
  }) => Promise<unknown>
  name: string
  organizationId: string
  plan: Extract<CsvTablePlan, { status: "ready" }>
  visibility: Visibility
}): Promise<GenericId<"collections"> | undefined> {
  try {
    const tableId = extractTableId(
      await create({
        organizationId,
        name,
        visibility: visibility as FunctionArgs<
          typeof api.tables.console.create
        >["visibility"],
        columns: plan.columns,
      })
    )
    const rows = plan.rows.map((row) => row.values)

    for (let start = 0; start < rows.length; start += importBatchSize) {
      await insertBatch({
        organizationId,
        tableId,
        rows: rows.slice(start, start + importBatchSize),
      })
    }

    toast.success(
      `Imported ${countLabel(rows.length, "row")} into ${name.trim()}.`
    )

    return tableId
  } catch (error) {
    showErrorToast(error, "Could not import the table.")

    return undefined
  }
}

const importBatchSize = 100

function extractTableId(result: unknown): GenericId<"collections"> {
  const tableId = isRecord(result) ? result.tableId : undefined

  if (typeof tableId !== "string") {
    throw new Error("Table creation failed.")
  }

  return tableId as GenericId<"collections">
}

import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { ColumnTypeSelect } from "../columns"
import {
  appendColumn,
  type ColumnDraft,
  columnTypeIcons,
  columnTypeOptions,
  newColumnDraft,
  renameColumn,
} from "../draft"
import { type TableColumn, type TableDetail } from "../types"

/** What the column sheet shows: a new column being created, or the details
 *  of an existing column (addressed by key, so a concurrent schema change
 *  keeps the sheet honest). */
export type ColumnSheetState =
  | { mode: "create" }
  | { mode: "edit"; key: string }

/** Right-side sheet for one column: creating appends an optional column,
 *  and details of an existing column are read-only except the display
 *  name — the only detail the evolution rules let change. */
export function ColumnSheet({
  onOpenChange,
  organizationId,
  state,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  state: ColumnSheetState | undefined
  table: TableDetail
}) {
  const form = useColumnSheet(organizationId, table, state, onOpenChange)
  const isCreating = state?.mode === "create"

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!form.isSaving) {
          onOpenChange(open)
        }
      }}
      open={state !== undefined && (isCreating || form.column !== undefined)}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>
            {isCreating ? "New column" : "Column details"}
          </SheetTitle>
          <SheetDescription>
            {isCreating
              ? "New columns are optional so existing rows stay valid."
              : "Existing columns can only change their display name."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            void form.submit()
          }}
        >
          <div
            className={cn(
              scrollFade,
              "grid flex-1 content-start gap-4 overflow-y-auto px-4"
            )}
          >
            {isCreating ? (
              <CreateFields form={form} />
            ) : (
              form.column && <DetailFields column={form.column} form={form} />
            )}
            {form.error === undefined ? null : (
              <p className="text-destructive text-xs" role="alert">
                {form.error}
              </p>
            )}
          </div>
          <SheetFooter className="flex-row justify-end">
            <Button
              disabled={form.isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={form.isSaving || !form.isDirty} type="submit">
              {form.isSaving ? <Loader2 className="animate-spin" /> : null}
              {isCreating ? "Add column" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CreateFields({ form }: { form: ColumnSheetForm }) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="column-sheet-key">Key</Label>
        <Input
          autoFocus
          id="column-sheet-key"
          onChange={(event) => form.update({ key: event.target.value })}
          placeholder="key"
          value={form.draft.key}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="column-sheet-name">Display name</Label>
        <Input
          id="column-sheet-name"
          onChange={(event) => form.update({ name: event.target.value })}
          placeholder="Optional"
          value={form.draft.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Type</Label>
        <ColumnTypeSelect
          onTypeChange={(type) => form.update({ type })}
          value={form.draft.type}
        />
      </div>
    </>
  )
}

function DetailFields({
  column,
  form,
}: {
  column: TableColumn
  form: ColumnSheetForm
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="column-sheet-name">Display name</Label>
        <Input
          autoFocus
          id="column-sheet-name"
          onChange={(event) => form.update({ name: event.target.value })}
          placeholder={column.key}
          value={form.draft.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="column-sheet-key">Key</Label>
        <Input disabled id="column-sheet-key" readOnly value={column.key} />
      </div>
      <div className="grid gap-1.5">
        <Label>Type</Label>
        <ColumnTypeBadge type={column.type} />
      </div>
      <label
        className="flex items-center gap-2 text-sm"
        htmlFor="column-sheet-required"
      >
        <Checkbox
          checked={column.required === true}
          disabled
          id="column-sheet-required"
        />
        Required
      </label>
    </>
  )
}

function ColumnTypeBadge({ type }: { type: TableColumn["type"] }) {
  const Icon = columnTypeIcons[type]
  const label =
    columnTypeOptions.find((option) => option.value === type)?.label ?? type

  return (
    <div className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-muted-foreground text-sm">
      <Icon aria-hidden className="size-3.5" />
      {label}
    </div>
  )
}

type ColumnSheetForm = ReturnType<typeof useColumnSheet>

function useColumnSheet(
  organizationId: string,
  table: TableDetail,
  state: ColumnSheetState | undefined,
  onOpenChange: (isOpen: boolean) => void
) {
  const updateTable = useMutation(api.tables.console.update)
  const [draft, setDraft] = useState(newColumnDraft)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)
  const column =
    state?.mode === "edit"
      ? table.columns.find((candidate) => candidate.key === state.key)
      : undefined

  // Reseed whenever the sheet opens or targets another column.
  useEffect(() => {
    setDraft({ ...newColumnDraft(), name: columnName(state, table) })
    setError(undefined)
  }, [state, table])

  async function submit() {
    const payload =
      state?.mode === "edit"
        ? {
            ok: true as const,
            columns: renameColumn(table.columns, state.key, draft.name),
          }
        : appendColumn(table.columns, draft)

    if (!payload.ok) {
      setError(payload.error)

      return
    }

    setIsSaving(true)

    try {
      await updateTable({
        organizationId,
        tableId: table.tableId,
        columns: payload.columns,
      })
      toast.success(
        state?.mode === "edit" ? "Column updated." : "Column added."
      )
      onOpenChange(false)
    } catch (caught) {
      showErrorToast(caught, "Could not save the column.")
    } finally {
      setIsSaving(false)
    }
  }

  return {
    column,
    draft,
    error,
    isDirty:
      state?.mode === "edit"
        ? draft.name !== (column?.name ?? "")
        : draft.key.trim() !== "",
    isSaving,
    submit,
    // New input clears the previous submit attempt's error right away.
    update: (patch: Partial<ColumnDraft>) => {
      setError(undefined)
      setDraft((current) => ({ ...current, ...patch }))
    },
  }
}

function columnName(state: ColumnSheetState | undefined, table: TableDetail) {
  if (state?.mode !== "edit") {
    return ""
  }

  return (
    table.columns.find((candidate) => candidate.key === state.key)?.name ?? ""
  )
}

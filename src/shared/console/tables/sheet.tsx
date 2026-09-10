import { Loader2 } from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field"
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
import { useRetained } from "../retain"
import { ColumnTypeBadge, ColumnTypeSelect } from "./columns"
import { type ColumnDraft } from "./draft"
import { type TableColumn, type TableDetail } from "./types"

/** What the column sheet shows: a new column being created, or an existing
 *  column addressed by its hidden id, so a concurrent schema change keeps
 *  the sheet honest. */
export type ColumnSheetState = { mode: "create" } | { mode: "edit"; id: string }

/** The sheet's form, kept by whatever binds it: the draft and how it
 *  changes, the column being edited, and the two ways the sheet saves. */
export type ColumnSheetForm = {
  /** The column being edited; absent while creating, or once a concurrent
   *  change has removed it. */
  column: TableColumn | undefined
  deleteColumn: () => Promise<void>
  draft: ColumnDraft
  error: string | undefined
  isDirty: boolean
  isSaving: boolean
  submit: () => Promise<void>
  update: (patch: Partial<ColumnDraft>) => void
}

/** Right-side sheet for one column. Columns behave like CSV headers:
 *  creating asks only for a name, type, and whether it is required, and an
 *  existing column renames freely, toggles required, or deletes — only its
 *  type is fixed for life. */
export function ColumnSheet({
  form: currentForm,
  onOpenChange,
  state,
  table,
}: {
  form: ColumnSheetForm
  onOpenChange: (isOpen: boolean) => void
  state: ColumnSheetState | undefined
  table: TableDetail
}) {
  const isOpen =
    state !== undefined &&
    (state.mode === "create" || currentForm.column !== undefined)
  const retained = useRetained(
    isOpen ? { form: currentForm, state } : undefined
  )
  const form = retained?.form ?? currentForm
  const isCreating = retained?.state?.mode === "create"

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!form.isSaving) {
          onOpenChange(open)
        }
      }}
      open={isOpen}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>
            {isCreating ? "New column" : "Column details"}
          </SheetTitle>
          <SheetDescription>
            {isCreating
              ? "Name it like a CSV header. The type is fixed once created."
              : "Rename it freely or delete it. The type is fixed."}
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
            <SheetFields form={form} isCreating={isCreating} table={table} />
            <FieldError>{form.error}</FieldError>
          </div>
          <ColumnSheetFooter
            form={form}
            isCreating={isCreating}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </SheetContent>
    </Sheet>
  )
}

function SheetFields({
  form,
  isCreating,
  table,
}: {
  form: ColumnSheetForm
  isCreating: boolean
  table: TableDetail
}) {
  // A brand-new column cannot start required once rows exist: no row holds
  // a value for it yet. Toggling an existing column on is checked row by
  // row on the server instead.
  const lockRequired = isCreating && table.rowCount > 0

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="column-sheet-name">Name</Label>
        <Input
          autoFocus
          id="column-sheet-name"
          onChange={(event) => form.update({ name: event.target.value })}
          placeholder="Column name"
          value={form.draft.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Type</Label>
        {isCreating ? (
          <ColumnTypeSelect
            onTypeChange={(type) => form.update({ type })}
            value={form.draft.type}
          />
        ) : (
          <ColumnTypeBadge type={form.draft.type} />
        )}
      </div>
      <RequiredField
        checked={form.draft.required}
        disabled={lockRequired}
        hint={
          lockRequired
            ? "New columns start optional — existing rows have no value for them yet."
            : undefined
        }
        onChange={(required) => form.update({ required })}
      />
    </>
  )
}

function RequiredField({
  checked,
  disabled,
  hint,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  hint: string | undefined
  onChange: (required: boolean) => void
}) {
  return (
    <div className="grid gap-1.5">
      <label
        className="flex items-center gap-2 text-sm"
        htmlFor="column-sheet-required"
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          id="column-sheet-required"
          onCheckedChange={(next) => onChange(next === true)}
        />
        Required
      </label>
      {hint === undefined ? null : (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  )
}

/** Cancel and save, plus the destructive delete path for existing columns:
 *  a quiet button that confirms what deletion really does. */
function ColumnSheetFooter({
  form,
  isCreating,
  onCancel,
}: {
  form: ColumnSheetForm
  isCreating: boolean
  onCancel: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <SheetFooter className="flex-row justify-end">
      {isCreating ? null : (
        <Button
          className="mr-auto"
          disabled={form.isSaving}
          onClick={() => setConfirming(true)}
          type="button"
          variant="destructive"
        >
          Delete
        </Button>
      )}
      <Button
        disabled={form.isSaving}
        onClick={onCancel}
        type="button"
        variant="outline"
      >
        Cancel
      </Button>
      <Button disabled={form.isSaving || !form.isDirty} type="submit">
        {form.isSaving ? <Loader2 className="animate-spin" /> : null}
        {isCreating ? "Add column" : "Save"}
      </Button>
      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete the {form.column?.name} column?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The column and its values are removed from every row. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void form.deleteColumn()}
              variant="destructive"
            >
              Delete column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SheetFooter>
  )
}

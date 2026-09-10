import { Loader2 } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { DialogForm } from "../materials/form"
import { buildRowValues, type RowDraft } from "./cells"
import { type TableColumn, type TableRow } from "./types"

export function AddRowDialog({
  columns,
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  columns: TableColumn[]
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (
    values: Record<string, unknown>
  ) => Promise<TableRow["rowId"] | null>
}) {
  const [draft, setDraft] = useState<RowDraft>({})
  const [isSaving, setIsSaving] = useState(false)
  const [resetOnOpen, setResetOnOpen] = useState(false)
  const wasOpen = useRef(isOpen)
  const built = buildRowValues(columns, draft)

  useLayoutEffect(() => {
    const opening = isOpen && !wasOpen.current
    wasOpen.current = isOpen
    if (opening && resetOnOpen) {
      setDraft({})
      setResetOnOpen(false)
    }
  }, [isOpen, resetOnOpen])

  async function submit() {
    if (!built.ok) {
      return
    }

    setIsSaving(true)

    if ((await onSubmit(built.values)) !== null) {
      setResetOnOpen(true)
      onOpenChange(false)
    }

    setIsSaving(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add row</DialogTitle>
          <DialogDescription>
            Values are checked against the table's columns before saving.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={!built.ok || isSaving}
          onSubmit={() => void submit()}
        >
          <div
            className={cn(
              scrollFade,
              // The fields scroll inside the dialog; the inset gives their focus
              // rings room, so a ring at the edge is not clipped by the scrollport.
              "-mx-1 -my-1 grid max-h-[60vh] gap-4 overflow-y-auto px-1 py-1"
            )}
          >
            {columns.map((column) => (
              <RowField
                column={column}
                draft={draft}
                key={column.id}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, [column.id]: value }))
                }
              />
            ))}
          </div>
          {built.ok || Object.keys(draft).length === 0 ? null : (
            <FieldError>{built.error}</FieldError>
          )}
          <DialogFooter>
            <Button disabled={!built.ok || isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              Add row
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function RowField({
  column,
  draft,
  onChange,
}: {
  column: TableColumn
  draft: RowDraft
  onChange: (value: string | boolean) => void
}) {
  const id = `row-field-${column.id}`
  const label =
    column.required === true ? column.name : `${column.name} (optional)`
  const entry = draft[column.id]

  if (column.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm" htmlFor={id}>
        <Checkbox
          checked={entry === true}
          id={id}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        {column.name}
      </label>
    )
  }

  const text = typeof entry === "string" ? entry : ""

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={text}
      />
    </div>
  )
}

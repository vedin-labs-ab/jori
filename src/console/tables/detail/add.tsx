import { Loader2 } from "lucide-react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type TableColumn } from "../types"
import { buildRowValues, type RowDraft } from "./cells"

export function AddRowDialog({
  columns,
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  columns: TableColumn[]
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (values: Record<string, unknown>) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<RowDraft>({})
  const [isSaving, setIsSaving] = useState(false)
  const built = buildRowValues(columns, draft)

  async function submit() {
    if (!built.ok) {
      return
    }

    setIsSaving(true)

    if (await onSubmit(built.values)) {
      setDraft({})
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
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto">
          {columns.map((column) => (
            <RowField
              column={column}
              draft={draft}
              key={column.key}
              onChange={(value) =>
                setDraft((current) => ({ ...current, [column.key]: value }))
              }
            />
          ))}
        </div>
        {built.ok || Object.keys(draft).length === 0 ? null : (
          <p className="text-destructive text-xs">{built.error}</p>
        )}
        <DialogFooter>
          <Button
            disabled={!built.ok || isSaving}
            onClick={() => void submit()}
            type="button"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            Add row
          </Button>
        </DialogFooter>
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
  const id = `row-field-${column.key}`
  const label =
    column.required === true ? column.name : `${column.name} (optional)`
  const entry = draft[column.key]

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
      {column.type === "json" ? (
        <Textarea
          className="min-h-24 font-mono text-xs"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder="{ }"
          value={text}
        />
      ) : (
        <Input
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={text}
        />
      )}
    </div>
  )
}

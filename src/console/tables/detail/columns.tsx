import { useMutation } from "convex/react"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { ColumnTypeSelect } from "../columns"
import { appendColumn, type ColumnDraft, newColumnDraft } from "../draft"
import { type TableDetail } from "../types"

/** The grid's trailing header affordance: a popover that appends one
 *  optional column through the table's additive schema evolution. */
export function ColumnAddPopover({
  disabled,
  organizationId,
  table,
}: {
  disabled: boolean
  organizationId: string
  table: TableDetail
}) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useColumnAdd(organizationId, table, () => setIsOpen(false))

  return (
    <Popover
      onOpenChange={(open) => {
        if (!form.isSaving) {
          setIsOpen(open)
          form.reset()
        }
      }}
      open={isOpen}
    >
      <PopoverTrigger asChild>
        <Button
          aria-label="New column"
          disabled={disabled}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Plus />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void form.submit()
          }}
        >
          <ColumnAddFields form={form} />
          {form.error === undefined ? null : (
            <p className="text-destructive text-xs" role="alert">
              {form.error}
            </p>
          )}
          <Button disabled={form.isSaving} size="sm" type="submit">
            {form.isSaving ? <Loader2 className="animate-spin" /> : null}
            Add column
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function ColumnAddFields({ form }: { form: ReturnType<typeof useColumnAdd> }) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="column-add-key">Key</Label>
        <Input
          autoFocus
          id="column-add-key"
          onChange={(event) => form.update({ key: event.target.value })}
          placeholder="key"
          value={form.draft.key}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="column-add-name">Display name</Label>
        <Input
          id="column-add-name"
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

function useColumnAdd(
  organizationId: string,
  table: TableDetail,
  onSaved: () => void
) {
  const updateTable = useMutation(api.tables.console.update)
  const [draft, setDraft] = useState(newColumnDraft)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  function reset() {
    setDraft(newColumnDraft())
    setError(undefined)
  }

  async function submit() {
    const appended = appendColumn(table.columns, draft)

    if (!appended.ok) {
      setError(appended.error)

      return
    }

    setIsSaving(true)

    try {
      await updateTable({
        organizationId,
        tableId: table.tableId,
        columns: appended.columns,
      })
      toast.success("Column added.")
      reset()
      onSaved()
    } catch (caught) {
      showErrorToast(caught, "Could not add the column.")
    } finally {
      setIsSaving(false)
    }
  }

  return {
    draft,
    error,
    isSaving,
    reset,
    submit,
    // New input clears the previous submit attempt's error right away.
    update: (patch: Partial<ColumnDraft>) => {
      setError(undefined)
      setDraft((current) => ({ ...current, ...patch }))
    },
  }
}

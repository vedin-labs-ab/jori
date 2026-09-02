import { useEffect, useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "../error"
import {
  appendColumn,
  type ColumnDraft,
  editColumn,
  newColumnDraft,
  removeColumn,
} from "./draft"
import { type ColumnSheetForm, type ColumnSheetState } from "./sheet"
import { type TableColumn, type TableDetail } from "./types"

/** The column sheet's form over the table's schema: appending, editing, or
 *  deleting one column is one write of every column, which the host runs. */
export function useColumnSheetForm({
  onOpenChange,
  onSave,
  state,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  /** Writes the table's whole column list; a rejection is the failure. */
  onSave: (columns: TableColumn[]) => Promise<unknown>
  state: ColumnSheetState | undefined
  table: TableDetail
}): ColumnSheetForm {
  const [draft, setDraft] = useState(newColumnDraft)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)
  const column =
    state?.mode === "edit"
      ? table.columns.find((candidate) => candidate.id === state.id)
      : undefined

  // Reseed whenever the sheet opens or targets another column.
  useEffect(() => {
    setDraft(draftFor(state, table))
    setError(undefined)
  }, [state, table])

  async function save(columns: TableColumn[], success: string) {
    setIsSaving(true)

    try {
      await onSave(columns)
      toast.success(success)
      onOpenChange(false)
    } catch (caught) {
      showErrorToast(caught, "Could not save the column.")
    } finally {
      setIsSaving(false)
    }
  }

  async function submit() {
    const payload =
      state?.mode === "edit"
        ? editColumn(table.columns, state.id, draft)
        : appendColumn(table.columns, draft)

    if (!payload.ok) {
      setError(payload.error)

      return
    }

    await save(
      payload.columns,
      state?.mode === "edit" ? "Column updated." : "Column added."
    )
  }

  async function deleteColumn() {
    if (state?.mode === "edit") {
      await save(removeColumn(table.columns, state.id), "Column deleted.")
    }
  }

  return {
    column,
    deleteColumn,
    draft,
    error,
    isDirty:
      state?.mode === "edit"
        ? draft.name !== (column?.name ?? "") ||
          draft.required !== (column?.required === true)
        : draft.name.trim() !== "",
    isSaving,
    submit,
    // New input clears the previous submit attempt's error right away.
    update: (patch: Partial<ColumnDraft>) => {
      setError(undefined)
      setDraft((current) => ({ ...current, ...patch }))
    },
  }
}

function draftFor(
  state: ColumnSheetState | undefined,
  table: TableDetail
): ColumnDraft {
  if (state?.mode !== "edit") {
    return newColumnDraft()
  }

  const column = table.columns.find((candidate) => candidate.id === state.id)

  return {
    name: column?.name ?? "",
    type: column?.type ?? "string",
    required: column?.required === true,
  }
}

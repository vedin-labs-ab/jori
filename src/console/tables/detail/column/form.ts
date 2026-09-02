import { useMutation } from "convex/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../../convex/_generated/api"
import {
  appendColumn,
  type ColumnDraft,
  editColumn,
  newColumnDraft,
  removeColumn,
} from "../../draft"
import { type TableColumn, type TableDetail } from "../../types"

/** What the column sheet shows: a new column being created, or an existing
 *  column addressed by its hidden id, so a concurrent schema change keeps
 *  the sheet honest. */
export type ColumnSheetState = { mode: "create" } | { mode: "edit"; id: string }

export type ColumnSheetForm = ReturnType<typeof useColumnSheet>

export function useColumnSheet(
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
      await updateTable({ organizationId, tableId: table.tableId, columns })
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

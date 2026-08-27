import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ColumnDraft, columnTypeOptions, newColumnDraft } from "./draft"

/** Editable column list for the create and edit table dialogs. Locked
 *  drafts (existing columns) only accept display-name changes; the
 *  required toggle is offered only where the evolution rules allow it. */
export function ColumnEditor({
  allowRequired,
  drafts,
  onChange,
}: {
  /** New columns on an existing table must stay optional. */
  allowRequired: boolean
  drafts: ColumnDraft[]
  onChange: (drafts: ColumnDraft[]) => void
}) {
  function updateDraft(id: string, patch: Partial<ColumnDraft>) {
    onChange(
      drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    )
  }

  return (
    <div className="grid gap-2">
      <Label>Columns</Label>
      <div className="grid gap-2">
        {drafts.map((draft) => (
          <ColumnDraftRow
            allowRequired={allowRequired}
            draft={draft}
            key={draft.id}
            onRemove={() =>
              onChange(drafts.filter((entry) => entry.id !== draft.id))
            }
            onUpdate={(patch) => updateDraft(draft.id, patch)}
          />
        ))}
      </div>
      <Button
        className="w-fit"
        onClick={() => onChange([...drafts, newColumnDraft()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add column
      </Button>
    </div>
  )
}

function ColumnDraftRow({
  allowRequired,
  draft,
  onRemove,
  onUpdate,
}: {
  allowRequired: boolean
  draft: ColumnDraft
  onRemove: () => void
  onUpdate: (patch: Partial<ColumnDraft>) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_1fr_7rem_auto_auto]">
      <Input
        aria-label="Column key"
        disabled={draft.locked}
        onChange={(event) => onUpdate({ key: event.target.value })}
        placeholder="key"
        value={draft.key}
      />
      <Input
        aria-label="Column name"
        onChange={(event) => onUpdate({ name: event.target.value })}
        placeholder="Display name"
        value={draft.name}
      />
      <ColumnTypeSelect draft={draft} onUpdate={onUpdate} />
      <span className="flex items-center gap-1.5">
        <Checkbox
          checked={draft.required}
          disabled={draft.locked || !allowRequired}
          id={`column-required-${draft.id}`}
          onCheckedChange={(checked) =>
            onUpdate({ required: checked === true })
          }
        />
        <Label
          className="font-normal text-muted-foreground text-xs"
          htmlFor={`column-required-${draft.id}`}
        >
          Required
        </Label>
      </span>
      <Button
        aria-label={`Remove column ${draft.key === "" ? "draft" : draft.key}`}
        className={draft.locked ? "invisible" : undefined}
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}

function ColumnTypeSelect({
  draft,
  onUpdate,
}: {
  draft: ColumnDraft
  onUpdate: (patch: Partial<ColumnDraft>) => void
}) {
  return (
    <Select
      disabled={draft.locked}
      onValueChange={(type) => onUpdate({ type: type as ColumnDraft["type"] })}
      value={draft.type}
    >
      <SelectTrigger aria-label="Column type" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {columnTypeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

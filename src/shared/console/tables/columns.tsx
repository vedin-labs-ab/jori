import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ColumnDraft, columnTypeIcons, columnTypeOptions } from "./draft"

/** Type picker for column forms, today the grid's column sheet. */
export function ColumnTypeSelect({
  disabled = false,
  onTypeChange,
  value,
}: {
  disabled?: boolean
  onTypeChange: (type: ColumnDraft["type"]) => void
  value: ColumnDraft["type"]
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(type) => onTypeChange(type as ColumnDraft["type"])}
      value={value}
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

/** The fixed type of an existing column, shown where the picker would be. */
export function ColumnTypeBadge({ type }: { type: ColumnDraft["type"] }) {
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

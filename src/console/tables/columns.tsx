import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ColumnDraft, columnTypeOptions } from "./draft"

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

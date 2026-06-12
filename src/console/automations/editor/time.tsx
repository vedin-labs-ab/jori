import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function AutomationTimePicker({
  className,
  id,
  label,
  onValueChange,
  value,
}: {
  className?: string
  id: string
  label: string
  onValueChange: (value: string) => void
  value: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        type="time"
        value={value}
      />
    </div>
  )
}

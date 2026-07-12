import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function AutomationTimePicker({
  className,
  id,
  onValueChange,
  timezone,
  value,
}: {
  className?: string
  id: string
  onValueChange: (value: string) => void
  timezone: string
  value: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        <span>
          Time{" "}
          <span className="font-normal text-muted-foreground">
            ({timezone})
          </span>
        </span>
      </Label>
      <Input
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        type="time"
        value={value}
      />
    </div>
  )
}

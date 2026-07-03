import { Search } from "lucide-react"
import { type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export function ConsolePageLayout({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}
      {...props}
    />
  )
}

export function ConsoleToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleToolbarActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleFilterToggle<Value extends string>({
  onValueChange,
  options,
  value,
}: {
  onValueChange: (value: Value) => void
  options: readonly { label: string; value: Value }[]
  value: Value
}) {
  return (
    <ToggleGroup
      className="flex-wrap justify-start"
      onValueChange={(next) => {
        if (next !== "") {
          onValueChange(next as Value)
        }
      }}
      type="single"
      value={value}
      variant="outline"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function ConsoleToolbarSearch({
  label,
  onValueChange,
  placeholder,
  value,
}: {
  label: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
      <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
      <Input
        aria-label={label}
        className="pr-2 pl-8"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder ?? label}
        value={value}
      />
    </div>
  )
}

export function ConsoleContentGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("grid gap-4", className)} {...props} />
}

export function ConsoleScrollableGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleScrollableList({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

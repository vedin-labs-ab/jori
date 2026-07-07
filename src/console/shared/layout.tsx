import { Search } from "lucide-react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react"
import { createPortal } from "react-dom"
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

// The console header hosts each page's search and create actions, beside the
// breadcrumb. The shell owns the target element; pages portal into it.
const HeaderActionsContext = createContext<HTMLElement | null>(null)

export function ConsoleHeaderActionsProvider({
  children,
  slot,
}: {
  children: ReactNode
  slot: HTMLElement | null
}) {
  return (
    <HeaderActionsContext.Provider value={slot}>
      {children}
    </HeaderActionsContext.Provider>
  )
}

export function ConsoleHeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderActionsContext)

  return slot === null
    ? null
    : createPortal(
        <div className="flex items-center gap-2">{children}</div>,
        slot
      )
}

/** Pairs a filter control with a muted inline label, shared across facets. */
export function ConsoleFilterField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-medium text-muted-foreground text-xs">
        {label}
      </span>
      {children}
    </div>
  )
}

export function ConsoleFilterToggle<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label?: string
  onValueChange: (value: Value) => void
  options: readonly { label: string; value: Value }[]
  value: Value
}) {
  const toggle = (
    <ToggleGroup
      aria-label={label}
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

  return label === undefined ? (
    toggle
  ) : (
    <ConsoleFilterField label={label}>{toggle}</ConsoleFilterField>
  )
}

/** Full-width row of in-content filter facets. */
export function ConsoleFilterGroup({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)}
      {...props}
    />
  )
}

export function ConsoleSearch({
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
    <div className="relative w-56 lg:w-72">
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

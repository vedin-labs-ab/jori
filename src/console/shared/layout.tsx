import { Search } from "lucide-react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** Standard padded console page. List pages that want the full-bleed
 *  table treatment use ConsoleListLayout from list/frame instead. */
export function ConsolePageLayout({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-6 md:px-6",
        className
      )}
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

export function ConsoleHeaderButton({
  className,
  icon,
  label,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  icon: ReactNode
  label: string
}) {
  return (
    <Button
      aria-label={label}
      className={cn("max-sm:size-7 max-sm:px-0", className)}
      {...props}
    >
      {icon}
      <span className="max-sm:hidden">{label}</span>
    </Button>
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
    <>
      <ConsoleSearchField
        className="hidden w-56 sm:block lg:w-72"
        label={label}
        onValueChange={onValueChange}
        placeholder={placeholder}
        value={value}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            aria-label={value === "" ? label : `${label}: ${value}`}
            className="sm:hidden"
            size="icon"
            type="button"
            variant={value === "" ? "outline" : "secondary"}
          >
            <Search />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(20rem,calc(100vw-2rem))] gap-0 rounded-md p-0 shadow-none ring-0 sm:hidden"
        >
          <ConsoleSearchField
            autoFocus
            label={label}
            onValueChange={onValueChange}
            placeholder={placeholder}
            value={value}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

function ConsoleSearchField({
  className,
  label,
  onValueChange,
  placeholder,
  value,
  ...props
}: {
  className?: string
  label: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
} & Omit<ComponentProps<typeof Input>, "onChange" | "value">) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
      <Input
        aria-label={label}
        className="pr-2 pl-8"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder ?? label}
        value={value}
        {...props}
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

/** Scroll-in-place stack: the div and ul forms differ only in semantics. */
const scrollableStack =
  "grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto"

export function ConsoleScrollableGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn(scrollableStack, className)} {...props} />
}

export function ConsoleScrollableList({
  className,
  ...props
}: ComponentProps<"ul">) {
  return <ul className={cn(scrollableStack, className)} {...props} />
}

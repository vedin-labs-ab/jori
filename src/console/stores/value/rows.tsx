import {
  Braces,
  Brackets,
  DecimalsArrowRight,
  Equal,
  Hash,
  List,
  type LucideIcon,
  Plus,
  SquareCheck,
  Type,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type ValueField, type ValueProperty } from "./model"

// Row dressing for the value form's hairline key/value grid: key cells
// with quiet type glyphs, indent spacers for nesting, the add/remove
// affordances in the table grid's ghost idiom, and error strips. The
// recursive composition lives in fields.tsx.

/** The key column: fixed width so values align into one editing column,
 *  with nesting indented inside it. */
const keyCellClassName =
  "flex h-9 w-36 shrink-0 items-center gap-1.5 self-start border-r px-3 text-xs md:w-44"

/** Ghost affordance filling a value cell, in the grid's New-row idiom. */
const ghostCellClassName =
  "flex h-9 w-full items-center gap-1.5 px-3 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"

/** The quiet at-a-glance type cue for a field: a muted glyph in the key
 *  cell (the table grid's header language) plus a hover title. */
function fieldGlyph(field: ValueField): { icon: LucideIcon; label: string } {
  switch (field.kind) {
    case "array":
      return { icon: Brackets, label: "array" }
    case "boolean":
      return { icon: SquareCheck, label: "boolean" }
    case "constant":
      return { icon: Equal, label: "fixed" }
    case "enum":
      return { icon: List, label: "choice" }
    case "number":
      return field.integer
        ? { icon: Hash, label: "integer" }
        : { icon: DecimalsArrowRight, label: "number" }
    case "object":
      return { icon: Braces, label: "object" }
    case "string":
      return { icon: Type, label: "string" }
  }
}

function IndentSpacers({ depth }: { depth: number }) {
  return Array.from({ length: depth }, (_, level) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: spacers are identical and positional
    <span aria-hidden className="w-3 shrink-0" key={level} />
  ))
}

/** One property's key cell: indent, type glyph, name, and the required
 *  mark in the table header's quiet asterisk idiom. */
export function KeyCell({
  depth,
  htmlFor,
  property,
}: {
  depth: number
  htmlFor?: string
  property: ValueProperty
}) {
  const glyph = fieldGlyph(property.field)
  const Icon = glyph.icon

  return (
    <span
      className={keyCellClassName}
      title={`${glyph.label} · ${property.required ? "required" : "optional"}`}
    >
      <IndentSpacers depth={depth} />
      <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {htmlFor === undefined ? (
        <span className="truncate">{property.name}</span>
      ) : (
        <label className="truncate" htmlFor={htmlFor}>
          {property.name}
        </label>
      )}
      {property.required ? (
        <span aria-hidden className="text-muted-foreground">
          *
        </span>
      ) : null}
    </span>
  )
}

/** The key cell for one array item: just its position, muted. */
export function IndexCell({ depth, index }: { depth: number; index: number }) {
  return (
    <span className={cn(keyCellClassName, "text-muted-foreground")}>
      <IndentSpacers depth={depth} />
      {index + 1}
    </span>
  )
}

/** A key cell with nothing to say: closes the key column's hairline under
 *  ghost affordance rows. */
export function BlankCell({ depth }: { depth: number }) {
  return (
    <span aria-hidden className={keyCellClassName}>
      <IndentSpacers depth={depth} />
    </span>
  )
}

/** The heading row for a nested object or array: the key column carries
 *  the structure, and optional groups keep a quiet unset control. */
export function GroupRow({
  depth,
  onUnset,
  property,
}: {
  depth: number
  onUnset?: () => void
  property: ValueProperty
}) {
  return (
    <div className="flex">
      <KeyCell depth={depth} property={property} />
      {onUnset === undefined ? null : (
        <RemoveButton label={`Unset ${property.name}`} onClick={onUnset} />
      )}
    </div>
  )
}

/** An optional field left unset: materializing it is an explicit choice,
 *  offered as a ghost affordance where its value would sit. */
export function UnsetRow({
  depth,
  onAdd,
  property,
}: {
  depth: number
  onAdd: () => void
  property: ValueProperty
}) {
  return (
    <div className="flex">
      <KeyCell depth={depth} property={property} />
      <button
        aria-label={`Add ${property.name}`}
        className={ghostCellClassName}
        onClick={onAdd}
        type="button"
      >
        <Plus aria-hidden className="size-3.5" />
        Add
      </button>
    </div>
  )
}

/** The ghost row that appends an array item, under the last one. */
export function AddItemRow({
  depth,
  error,
  label,
  onAdd,
}: {
  depth: number
  error: string | undefined
  label: string
  onAdd: () => void
}) {
  return (
    <div className="flex">
      <BlankCell depth={depth} />
      <div className="min-w-0 flex-1">
        <button
          aria-label={`Add ${label} item`}
          className={ghostCellClassName}
          onClick={onAdd}
          type="button"
        >
          <Plus aria-hidden className="size-3.5" />
          Add item
        </button>
        <FieldError className="px-3 pb-2" message={error} />
      </div>
    </div>
  )
}

/** Quiet per-row removal: always present, never shouting. */
export function RemoveButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="mr-1.5 ml-auto flex size-6 shrink-0 items-center justify-center self-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={onClick}
      type="button"
    >
      <X aria-hidden className="size-3.5" />
    </button>
  )
}

export function FieldError({
  className,
  message,
}: {
  className?: string
  message: string | undefined
}) {
  if (message === undefined) {
    return null
  }

  return (
    <p className={cn("text-destructive text-xs", className)} role="alert">
      {message}
    </p>
  )
}

/** A full-width strip for errors reported at a group's own path. */
export function ErrorRow({ message }: { message: string | undefined }) {
  if (message === undefined) {
    return null
  }

  return (
    <div className="px-3 py-2">
      <FieldError message={message} />
    </div>
  )
}

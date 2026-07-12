import { getToolPermission } from "@contracts/permissions"
import { type ReactNode } from "react"
import { Prop } from "../section"

// Marketing shows the three modes a user configures; "required" tools are an
// implementation detail the trust page explains in prose.
const modeLabels = {
  allowed: "Allowed",
  blocked: "Blocked",
  prompted: "Ask first",
} as const

const modeStyles = {
  allowed: "border text-muted-foreground",
  blocked: "border border-dashed text-muted-foreground",
  prompted: "bg-primary/10 font-medium text-primary",
} as const

export type ModeRow = {
  tool: string
  mode: keyof typeof modeLabels
}

/** Permission rows rendered from the live contract, so names and
 *  descriptions cannot drift from the product. */
export function ModeMatrix({
  label,
  rows,
}: {
  label: ReactNode
  rows: readonly ModeRow[]
}) {
  return (
    <Prop label={label}>
      <div className="divide-y">
        {rows.map((row) => (
          <ModeMatrixRow key={row.tool} row={row} />
        ))}
      </div>
    </Prop>
  )
}

function ModeMatrixRow({ row }: { row: ModeRow }) {
  const permission = getToolPermission(row.tool)

  if (permission === undefined) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">{permission.label}</p>
        <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
          {permission.description}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${modeStyles[row.mode]}`}
      >
        {modeLabels[row.mode]}
      </span>
    </div>
  )
}

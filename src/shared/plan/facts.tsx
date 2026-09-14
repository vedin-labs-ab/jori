import { cn } from "@/lib/utils"
import { type PlanFact } from "."

/** The facts of a plan set across rather than down: a folder is wide, and
 *  a row across it is mostly air. `dense` is the console's cut, two across
 *  at the dialog's width with the notes kept. */
export function PlanFacts({
  className,
  dense = false,
  facts,
}: {
  className?: string
  dense?: boolean
  facts: readonly PlanFact[]
}) {
  return (
    <dl
      className={cn(
        "grid border-t",
        dense
          ? "grid-cols-2 gap-x-5 gap-y-4 pt-4"
          : "gap-x-12 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {facts.map((fact) => (
        <div key={fact.term}>
          <dt
            className={cn(
              "flex items-center gap-2 text-muted-foreground",
              dense ? "text-xs" : "text-sm"
            )}
          >
            <fact.icon
              className={cn("shrink-0", dense ? "size-3.5" : "size-4")}
            />
            {fact.term}
          </dt>
          <dd className={dense ? "mt-1" : "mt-2"}>
            <span
              className={cn(
                "block font-medium tracking-tight",
                dense ? "text-sm" : "text-lg"
              )}
            >
              {fact.value}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-muted-foreground leading-relaxed",
                dense ? "text-xs" : "text-sm"
              )}
            >
              {fact.note}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

import { Slot } from "radix-ui"
import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * A folder: tabs along the top edge and one body the open tab joins. The
 * open tab shares the body's ground and paints over its top edge, so the
 * two read as one shape; a closed tab sits a step lower and behind, the
 * way the next folder in a drawer does. Which tab is open is whichever
 * carries `data-state="active"`, so a Radix trigger can be one as easily
 * as a label that never changes.
 */
export function Folder({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

/** The row of tabs. `asChild` lets a tab list own the element, so the row
 *  is the list. */
export function FolderTabs({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      className={cn(
        "relative z-10 -mb-px flex items-end gap-1.5 pl-5",
        className
      )}
      {...props}
    />
  )
}

export function FolderTab({
  active = false,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-11 items-center rounded-t-xl border bg-muted px-5 font-medium text-muted-foreground text-sm transition-colors outline-none",
        "hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-[state=active]:h-12 data-[state=active]:border-b-transparent data-[state=active]:bg-card data-[state=active]:text-foreground",
        className
      )}
      data-state={active ? "active" : "inactive"}
      {...props}
    />
  )
}

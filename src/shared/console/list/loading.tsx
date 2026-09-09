import { Spinner } from "@/components/ui/spinner"

/** Shared page-loading state: one centered spinner filling the region.
 *  Lives happily inside any flex column (page layouts, list content). */
export function ConsoleListLoading({
  label = "Loading page",
}: {
  label?: string
}) {
  return (
    <div
      aria-label={label}
      role="status"
      className="grid min-h-0 min-w-0 flex-1 place-content-center py-16"
    >
      <Spinner aria-hidden className="size-5 text-muted-foreground" />
    </div>
  )
}

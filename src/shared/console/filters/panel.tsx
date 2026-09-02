import { X } from "lucide-react"
import { type ReactNode, type Ref } from "react"
import { Button } from "@/components/ui/button"

/** The panel itself, wherever it is shown: its title row, with Reset once
 *  something is off its default and the close control, over the page's
 *  facets stacked in their own scrollport. */
export function ConsoleFilterPanel({
  activeCount,
  children,
  closeRef,
  onClose,
  onReset,
  title = <h2 className="font-medium text-sm">Filters</h2>,
}: {
  activeCount: number
  children: ReactNode
  closeRef?: Ref<HTMLButtonElement>
  onClose: () => void
  onReset: () => void
  /** The sheet hands in its own title element; the aside uses a heading. */
  title?: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-3 pl-4">
        {title}
        <div className="ml-auto flex items-center gap-1">
          {activeCount > 0 ? (
            <Button onClick={onReset} size="sm" type="button" variant="ghost">
              Reset
            </Button>
          ) : null}
          <Button
            aria-label="Close filters"
            onClick={onClose}
            ref={closeRef}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  )
}

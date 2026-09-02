import { type ReactNode, type RefObject, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { ConsoleHeaderActions } from "../layout"
import { ConsoleFilterButton } from "./button"
import { useConsoleFilters } from "./context"
import { ConsoleFilterPanel } from "./panel"

/** A page with a filter panel: the Filters button ahead of the page's own
 *  header actions, and the panel beside the content — pushing it aside on
 *  wide screens, over it as a sheet below `md`. The page renders its
 *  facets into `panel` and says how many are off their defaults. */
export function ConsoleFiltered({
  actions,
  activeCount,
  children,
  onReset,
  panel,
}: {
  /** The page's header actions, in order, after the Filters button. */
  actions?: ReactNode
  activeCount: number
  children: ReactNode
  onReset: () => void
  panel: ReactNode
}) {
  const { open, setOpen } = useConsoleFilters()
  const isMobile = useIsMobile()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const toggle = () => setOpen(!open)

  useFocusOnToggle(open, !isMobile, buttonRef, closeRef)

  const content = (title?: ReactNode) => (
    <ConsoleFilterPanel
      activeCount={activeCount}
      closeRef={closeRef}
      onClose={() => setOpen(false)}
      onReset={onReset}
      title={title}
    >
      {panel}
    </ConsoleFilterPanel>
  )

  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleFilterButton
          activeCount={activeCount}
          onClick={toggle}
          open={open}
          ref={buttonRef}
        />
        {actions}
      </ConsoleHeaderActions>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        {isMobile ? (
          <FilterSheet closeRef={closeRef} onOpenChange={setOpen} open={open}>
            {content(<SheetTitle>Filters</SheetTitle>)}
          </FilterSheet>
        ) : (
          <FilterAside onToggle={toggle} open={open}>
            {content()}
          </FilterAside>
        )}
      </div>
    </>
  )
}

/** The panel beside the content. Its width animates between nothing and
 *  the panel's, the way the sidebar's does, so the content reflows with it;
 *  closed, it is inert so nothing inside can take focus. The rail on its
 *  edge toggles it by pointer; the header button is the keyboard path. */
function FilterAside({
  children,
  onToggle,
  open,
}: {
  children: ReactNode
  onToggle: () => void
  open: boolean
}) {
  return (
    <div
      className={cn(
        "relative hidden shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none md:block",
        open ? "w-72" : "w-0"
      )}
      data-slot="filters-aside"
      data-state={open ? "open" : "closed"}
    >
      <aside
        aria-label="Filters"
        className="h-full overflow-hidden"
        inert={!open}
      >
        <div className="h-full w-72 border-l bg-background">{children}</div>
      </aside>
      <button
        aria-label="Toggle filters"
        // The sidebar rail's own treatment: a 2px line that fills on hover.
        className={cn(
          "-translate-x-1/2 absolute inset-y-0 left-0 z-20 hidden w-4 transition-all ease-linear md:flex",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border",
          open ? "cursor-e-resize" : "cursor-w-resize"
        )}
        data-slot="filters-rail"
        onClick={onToggle}
        tabIndex={-1}
        title="Toggle filters"
        type="button"
      />
    </div>
  )
}

/** Below `md` the panel is a sheet over the content rather than a column
 *  beside it. The sheet manages focus itself: in to the close control, and
 *  back to whatever opened it. */
function FilterSheet({
  children,
  closeRef,
  onOpenChange,
  open,
}: {
  children: ReactNode
  closeRef: RefObject<HTMLButtonElement | null>
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        aria-describedby={undefined}
        className="bg-background data-[side=right]:w-72"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          closeRef.current?.focus()
        }}
        showCloseButton={false}
        side="right"
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

/** Opening lands focus on the panel's close control; closing hands it back
 *  to the header button. Only a change moves focus: a page that mounts
 *  with the panel already open leaves focus where it is. */
function useFocusOnToggle(
  open: boolean,
  enabled: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  closeRef: RefObject<HTMLButtonElement | null>
) {
  const previous = useRef(open)

  useEffect(() => {
    if (previous.current === open) {
      return
    }

    previous.current = open

    if (enabled) {
      const target = open ? closeRef.current : buttonRef.current

      target?.focus({ preventScroll: true })
    }
  }, [buttonRef, closeRef, enabled, open])
}

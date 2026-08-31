import { useNavigate } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { X } from "lucide-react"
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConsoleListContent } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { useRetained } from "../../shared/retain"
import { type UsageDays } from "./types"

// Usage is another view of the folder you are already in, not somewhere
// else to be, so it arrives as a panel over that folder's page. The panel
// stays mounted for the whole cycle and moves on a transition, so it slides
// both ways with no presence machinery to keep in step; the view inside it
// mounts on the first open and stays, which keeps Recharts out of the
// page's chunk without emptying the panel as it leaves.

const UsageView = lazy(async () => ({
  default: (await import("./view")).UsageView,
}))

/** The page, and the usage panel that covers it. */
export function UsageOverlay({
  children,
  days,
  folderId,
  organizationId,
}: {
  children: ReactNode
  /** The window the panel shows, absent while it is closed. */
  days: UsageDays | undefined
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  organizationId: string
}) {
  const isOpen = days !== undefined
  const shown = useRetained(days)
  const showUsage = useUsageNavigation(folderId)
  const panel = useOpenedPanel(isOpen)

  useCloseOnEscape(isOpen, showUsage)

  return (
    <>
      {/* Covered, so out of reach: the page keeps its layout box but leaves
          the tab order and the accessibility tree while the panel is up. */}
      <div className="contents" inert={isOpen}>
        {children}
      </div>
      <div
        className={cn(
          // Above the page's own layers: sticky table headers, and the
          // selection bar that floats over them.
          "absolute inset-0 z-30 overflow-hidden",
          // Closed, the container still covers the page it is waiting over,
          // so it has to let every click through to it.
          !isOpen && "pointer-events-none"
        )}
        inert={!isOpen}
      >
        <div
          className={cn(
            "flex h-full flex-col bg-background outline-none transition-[transform,box-shadow] duration-300 ease-out motion-reduce:transition-none",
            // The shadow is the depth cue while the panel is in transit; at
            // rest off-screen it would band the page's right edge, so it
            // fades with the same move that carries it away.
            isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
          )}
          ref={panel}
          tabIndex={-1}
        >
          <UsagePanelHeader onClose={() => showUsage(undefined)} />
          {shown === undefined ? null : (
            <Suspense fallback={<UsagePanelLoading />}>
              <UsageView
                days={shown}
                folderId={folderId}
                onDaysChange={showUsage}
                organizationId={organizationId}
              />
            </Suspense>
          )}
        </div>
      </div>
    </>
  )
}

/** The panel's window rides in the URL, so opening it, changing it, and
 *  closing it are all the same one parameter — on the page it covers, which
 *  is a folder's or the whole tree's. */
function useUsageNavigation(folderId: GenericId<"folders"> | undefined) {
  const navigate = useNavigate()

  return useCallback(
    (days: UsageDays | undefined) => {
      const search = days === undefined ? {} : { usage: days }

      void (folderId === undefined
        ? navigate({ replace: true, search, to: "/folders" })
        : navigate({
            params: { folderId },
            replace: true,
            search,
            to: "/folders/$folderId",
          }))
    },
    [folderId, navigate]
  )
}

/** The panel's own chrome. It covers the page, not the console header, so
 *  the breadcrumb above still says which folder this is about. */
function UsagePanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6">
      <span className="font-medium text-xs/relaxed">Usage</span>
      <Button
        aria-label="Close usage"
        onClick={onClose}
        size="icon-sm"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}

function UsagePanelLoading() {
  return (
    <ConsoleListContent>
      <ConsoleListLoading />
    </ConsoleListContent>
  )
}

/** Opening moves the keyboard into the panel, since what it left behind is
 *  now inert. */
function useOpenedPanel(isOpen: boolean) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      panel.current?.focus()
    }
  }, [isOpen])

  return panel
}

/** Escape closes the panel, as it would a dialog — this is not one, so the
 *  key is wired by hand. */
function useCloseOnEscape(
  isOpen: boolean,
  showUsage: (days: UsageDays | undefined) => void
) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        showUsage(undefined)
      }
    }

    window.addEventListener("keydown", close)

    return () => window.removeEventListener("keydown", close)
  }, [isOpen, showUsage])
}

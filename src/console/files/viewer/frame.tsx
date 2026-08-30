import { type ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { type ViewerStatus } from "./status"

/** The viewport every file type renders into. It claims the full content
 *  region up front and keeps the media invisible until it has loaded at
 *  its final size, then fades it in — so the page never shifts. Loading
 *  shows the platform's centered spinner in the meantime. Media kinds get
 *  a faint dot grid that grounds the item in the space around it. */
export function ViewerFrame({
  children,
  dotted = false,
  status,
}: {
  children: ReactNode
  dotted?: boolean
  status: ViewerStatus
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/30",
        dotted &&
          "[background-image:radial-gradient(color-mix(in_oklab,var(--muted-foreground)_22%,transparent)_1px,transparent_1px)] [background-size:24px_24px]"
      )}
    >
      {status === "error" ? (
        <ViewerNotice>Could not load the preview.</ViewerNotice>
      ) : (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none",
            status === "ready" ? "opacity-100" : "opacity-0"
          )}
        >
          {children}
        </div>
      )}
      {status === "loading" ? (
        <ViewerNotice>
          <Spinner className="size-5 text-muted-foreground" />
        </ViewerNotice>
      ) : null}
    </div>
  )
}

function ViewerNotice({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-content-center text-muted-foreground text-sm">
      {children}
    </div>
  )
}

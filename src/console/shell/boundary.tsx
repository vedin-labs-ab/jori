import { CatchBoundary, type ErrorComponentProps } from "@tanstack/react-router"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { readErrorMessage } from "@/shared/console/error"
import {
  ConsoleEmptyState,
  ConsoleListEmpty,
} from "@/shared/console/list/empty"

/**
 * Contains a page failure to the page.
 *
 * The root boundary is the only other one the console has, and it replaces
 * the whole document: one panel throwing on a field it did not expect took
 * the sidebar, the header, and every other route down with it, and the only
 * way back was a full reload. Here the shell outlives the failure, so the
 * next destination stays one click away.
 *
 * Reset only when the router commits a navigation, including search changes.
 * Resetting on the address bar's pending path can retry the failed old page
 * before the new match mounts and leave the new destination behind its error.
 */
export function ConsolePageBoundary({
  children,
  resetKey,
}: {
  children: ReactNode
  resetKey: unknown
}) {
  return (
    <CatchBoundary errorComponent={PageError} getResetKey={() => resetKey}>
      {children}
    </CatchBoundary>
  )
}

/** The console's own empty state, one role over: same icon chip and rhythm,
 *  so a failed page reads as part of Jori rather than as a stack trace. */
function PageError({ error, reset }: ErrorComponentProps) {
  const state = readErrorState(error)

  return (
    <ConsoleListEmpty>
      <ConsoleEmptyState
        action={
          <>
            {/* Default variant, like the console's other empty-state
                actions and the root boundary's own way out: recovery is the
                one thing to do here, so it should not read as secondary. */}
            <Button
              onClick={state.stale ? () => window.location.reload() : reset}
              type="button"
            >
              {state.stale ? "Reload" : "Try again"}
            </Button>
            {import.meta.env.DEV ? (
              <code className="block w-full overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 text-left font-mono text-muted-foreground text-xs">
                {readErrorMessage(error, "Unknown application error.")}
              </code>
            ) : null}
          </>
        }
        description={state.description}
        icon={state.stale ? RefreshCw : TriangleAlert}
        title={state.title}
      />
    </ConsoleListEmpty>
  )
}

/** What a browser says when a dynamic import 404s, which is what a route
 *  chunk looks like from an open tab after Jori has been deployed over it. */
const staleBuildSignals = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
]

/**
 * A stale build is the one failure retrying cannot fix: the chunk this tab
 * is asking for is gone from the server, so resetting the boundary re-runs
 * the same dead import. Only a reload picks up the current build, so that
 * case gets its own copy and its own button rather than a "Try again" that
 * is guaranteed to land here again.
 */
function readErrorState(error: unknown) {
  const stale =
    error instanceof Error &&
    staleBuildSignals.some((signal) => error.message.includes(signal))

  if (stale) {
    return {
      description:
        "Jori was updated while this tab was open. Reload to pick up the current version.",
      stale,
      title: "This page is out of date",
    }
  }

  return {
    description:
      "Nothing else in Jori is affected. Try again, or pick another page from the sidebar.",
    stale,
    title: "This page didn't load",
  }
}

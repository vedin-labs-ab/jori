import { Check, TriangleAlert } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { absoluteTime, relativeTime, useNow } from "../time"

/** What an editor's autosave is currently doing. `undefined` upstream means
 *  the view is read-only and carries no save affordance at all. */
export type SaveState = "idle" | "saving" | "saved" | "error"

/**
 * The freshness stretch of a file or store toolbar's metadata line: when the
 * thing was last written, and, in an editor, whether the edit in hand has
 * landed.
 *
 * Siblings rather than a wrapper, so the toolbar's own flex row spaces this
 * pair on the same rhythm as the owner and the size beside it.
 */
export function SaveMeta({
  saveStatus,
  updatedAt,
}: {
  saveStatus?: SaveState
  updatedAt: number
}) {
  const now = useNow(30_000)
  // Only a save that is genuinely in flight shimmers. A failed one is not
  // working, and animating it read as progress that had in fact stopped.
  const isSaving = saveStatus === "saving"
  const hasFailed = saveStatus === "error"

  return (
    <>
      <span
        className={cn("shrink-0", isSaving && "shimmer")}
        title={absoluteTime(updatedAt)}
      >
        Updated {relativeTime(updatedAt, now)}
      </span>
      {saveStatus === undefined ? null : (
        <>
          {/* The slot exists only while a save is in motion, just done, or
              stuck: collapsed it gives back its width and the flex gap, so
              idle shows no hole where an icon might one day be. */}
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center overflow-hidden transition-[max-width,margin,opacity,scale] duration-200 ease-out",
              saveStatus === "idle" && "-ml-1.5 max-w-0 scale-50 opacity-0",
              // A failure keeps words next to its icon, so it opens to a
              // width that fits them rather than to the icon's own.
              saveStatus !== "idle" && "scale-100 opacity-100",
              saveStatus !== "idle" && (hasFailed ? "max-w-24" : "max-w-4")
            )}
          >
            <SaveIcon saveStatus={saveStatus} />
            {hasFailed ? (
              <span className="ml-1 font-medium text-destructive">
                Not saved
              </span>
            ) : null}
          </span>
          {/* A failure is the one state the reader has to do something about,
              so it interrupts. A save that landed waits its turn. */}
          <span
            aria-live={hasFailed ? "assertive" : "polite"}
            className="sr-only"
          >
            {hasFailed ? "Couldn't save. Retrying." : null}
            {saveStatus === "saved" ? "Saved" : null}
          </span>
        </>
      )}
    </>
  )
}

/** The save's state beside a page's name, for a page whose provenance
 *  lives in a menu: nothing at rest, the spinner while a save is in
 *  flight, a check as it lands, and the warning with its words when it
 *  didn't. */
export function SaveSignal({ saveStatus }: { saveStatus?: SaveState }) {
  if (saveStatus === undefined || saveStatus === "idle") {
    return null
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs">
      <SaveIcon saveStatus={saveStatus} />
      {saveStatus === "error" ? (
        <span className="font-medium text-destructive">Not saved</span>
      ) : null}
      <span
        aria-live={saveStatus === "error" ? "assertive" : "polite"}
        className="sr-only"
      >
        {saveStatus === "error" ? "Couldn't save. Retrying." : null}
        {saveStatus === "saved" ? "Saved" : null}
      </span>
    </span>
  )
}

/** One glyph per state, in the console's semantic colours: a check for a
 *  save that landed, a warning for one that didn't, and the spinner for
 *  every moment in between. */
function SaveIcon({ saveStatus }: { saveStatus: SaveState }) {
  if (saveStatus === "error") {
    return <TriangleAlert className="size-3 text-destructive" />
  }

  if (saveStatus === "saved") {
    return <Check className="size-3 text-success" />
  }

  return <Spinner className="size-3" />
}

import { Check, TriangleAlert } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

/** What an editor's autosave is currently doing. `undefined` upstream means
 *  the view is read-only and carries no save affordance at all. */
export type SaveState = "idle" | "saving" | "saved" | "error"

/** One glyph per state, in the console's semantic colors: a check for a
 *  save that landed, a warning for one that didn't, and the spinner for
 *  every moment in between. The shell shows it in place of the chevron on
 *  the material's name while a save is in motion. */
export function SaveIcon({ saveStatus }: { saveStatus: SaveState }) {
  if (saveStatus === "error") {
    return <TriangleAlert className="size-3 text-destructive" />
  }

  if (saveStatus === "saved") {
    return <Check className="size-3 text-success" />
  }

  return <Spinner className="size-3" />
}

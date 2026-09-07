import { Button } from "@/components/ui/button"
import { Dock, DockDivider } from "../../dock"
import { type PanePreference } from "./tabs"

/** Said once per browser, the first time a reply opens the pane: what
 *  just happened, and the two ways to have it from here on. It floats
 *  over the foot of the thread the way a selection's bar floats over a
 *  list, clear of the composer, and leaves with the answer. */
export function PaneHint({
  onChoose,
}: {
  onChoose: (preference: PanePreference) => void
}) {
  return (
    <Dock className="gap-1" label="Resources beside the chat">
      <span className="whitespace-nowrap px-2 text-xs">
        New resources open beside your chat.
      </span>
      <DockDivider />
      <Button onClick={() => onChoose("keep")} type="button" variant="ghost">
        Keep this
      </Button>
      <Button onClick={() => onChoose("manual")} type="button" variant="ghost">
        Open manually
      </Button>
    </Dock>
  )
}

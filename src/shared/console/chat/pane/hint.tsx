import { Check, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Dock, DockDivider, DockGroup } from "../../dock"
import { type PanePreference } from "./tabs"

const explanation =
  "When Jori creates or mentions a table, file, store, or job, it opens in the pane beside the chat so you can see the work as it lands. Keep this to let that happen on its own, or open resources yourself from their cards. Either way, you can change it later from a tab's menu."

/** Said once per browser, the first time a reply opens the pane: what
 *  just happened, and the two ways to have it from here on. It floats
 *  over the foot of the thread the way a selection's bar floats over a
 *  list, clear of the composer, and leaves with the answer. The why is
 *  behind the info mark, opened by a press so a touch can read it. */
export function PaneHint({
  onChoose,
}: {
  onChoose: (preference: PanePreference) => void
}) {
  return (
    <Dock label="Resources beside the chat">
      <DockGroup>
        <span className="flex min-w-0 items-center gap-1.5 pr-2 pl-1 text-pretty text-xs">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label="About resources opening beside the chat"
                className="size-6 shrink-0 text-muted-foreground"
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Info />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-72 text-pretty" side="top">
              {explanation}
            </PopoverContent>
          </Popover>
          New resources open beside your chat.
        </span>
      </DockGroup>
      <DockDivider />
      <DockGroup>
        <Button onClick={() => onChoose("keep")} type="button" variant="ghost">
          <Check className="text-primary" />
          Keep this
        </Button>
        <Button
          onClick={() => onChoose("manual")}
          type="button"
          variant="ghost"
        >
          Open manually
        </Button>
      </DockGroup>
    </Dock>
  )
}

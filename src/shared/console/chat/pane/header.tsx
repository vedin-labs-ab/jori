import { ArrowUpRight, ChevronDown } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import { type MaterialBreadcrumb } from "../../materials/breadcrumb"
import { SaveIcon } from "../../materials/save"
import { ConsoleLink } from "../../shell/link"
import { referencePresentation } from "../presentation"
import { type ChatReference, type ReferenceTarget } from "../types"
import { targetDestination } from "./routes"
import { type PanePreference } from "./tabs"

/** Under the strip, what the active tab holds: the target's icon and
 *  name, its kind, and the way to its own page, so the pane is never the
 *  end of the road. A view that hangs a menu off its name — a store's, a
 *  file's — gets it here, where the page would have it in the crumb. */
export function PaneHeader({
  crumb,
  onHint,
  reference,
  target,
}: {
  /** What the body published for the shell's breadcrumb, caught here. */
  crumb: MaterialBreadcrumb | undefined
  onHint: ((preference: PanePreference) => void) | undefined
  reference: ChatReference | undefined
  target: ReferenceTarget
}) {
  const presentation = referencePresentation(target.kind, reference?.name ?? "")
  const Icon = presentation.icon
  const isUnavailable =
    reference === undefined || reference.unavailable === true

  return (
    <div className="grid shrink-0 gap-2 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <PaneName
          crumb={crumb}
          name={crumb?.name ?? reference?.name ?? presentation.label}
        />
        <SeparatorDot className="text-muted-foreground/60" />
        <span className="shrink-0 text-muted-foreground text-xs">
          {isUnavailable ? "No longer available" : presentation.label}
        </span>
        {isUnavailable ? null : (
          <Button
            asChild
            className="ml-auto shrink-0"
            size="sm"
            variant="ghost"
          >
            <ConsoleLink {...targetDestination(target)}>
              Open page
              <ArrowUpRight />
            </ConsoleLink>
          </Button>
        )}
      </div>
      {onHint === undefined ? null : <PaneHint onChoose={onHint} />}
    </div>
  )
}

/** The name — plain, or the trigger of the menu the body published, with
 *  the save's own glyph in the chevron's place while a save is in motion. */
function PaneName({
  crumb,
  name,
}: {
  crumb: MaterialBreadcrumb | undefined
  name: string
}) {
  if (crumb?.menu === undefined) {
    return <span className="min-w-0 truncate font-medium">{name}</span>
  }

  const isIdle = crumb.saveStatus === undefined || crumb.saveStatus === "idle"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="min-w-0 gap-1 px-0 font-medium text-foreground text-sm hover:px-1.5 focus-visible:px-1.5 aria-expanded:px-1.5"
          type="button"
          variant="ghost"
        >
          <span
            className={cn(
              "truncate",
              crumb.saveStatus === "saving" && "shimmer"
            )}
          >
            {name}
          </span>
          {isIdle ? (
            <ChevronDown
              aria-hidden
              className="size-3! shrink-0 text-muted-foreground"
            />
          ) : (
            <span aria-hidden className="flex shrink-0 [&_svg]:size-3!">
              <SaveIcon saveStatus={crumb.saveStatus ?? "idle"} />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      {crumb.menu}
    </DropdownMenu>
  )
}

/** Said once per browser, the first time a reply opens the pane: what
 *  just happened, and the two ways to have it from here on. */
function PaneHint({
  onChoose,
}: {
  onChoose: (preference: PanePreference) => void
}) {
  return (
    <Alert>
      <AlertTitle>New resources open beside your chat.</AlertTitle>
      <AlertDescription>
        What a reply is about opens here as you read it. Keep that, or open
        resources yourself from their cards.
      </AlertDescription>
      <div className="mt-1 flex gap-2">
        <Button
          onClick={() => onChoose("keep")}
          size="xs"
          type="button"
          variant="outline"
        >
          Keep this
        </Button>
        <Button
          onClick={() => onChoose("manual")}
          size="xs"
          type="button"
          variant="ghost"
        >
          Open manually
        </Button>
      </div>
    </Alert>
  )
}

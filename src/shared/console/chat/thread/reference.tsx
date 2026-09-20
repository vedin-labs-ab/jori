import { type ReferenceTarget } from "@contracts/replies/references"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import { type ReferenceView } from "../../references"
import { referencePresentation } from "../../references/presentation"
import { type OpenTarget } from "../pane/tabs"

const cardClassName =
  "flex w-fit max-w-full min-w-0 items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs"

/** A resource a reply is about, as a card that opens it: the kind's
 *  icon, the name, and one line of detail after a dot. A click previews
 *  the resource and a double click keeps it, the way the pane's tabs do.
 *  When the host cannot resolve the target, or says it is gone, the card
 *  says so in the detail's place and opens nothing. */
export function ReferenceCard({
  onOpen,
  reference,
  target,
}: {
  onOpen: OpenTarget
  reference: ReferenceView | undefined
  target: ReferenceTarget
}) {
  const presentation = referencePresentation(target.kind, reference?.name ?? "")
  const Icon = presentation.icon

  if (reference === undefined || reference.unavailable === true) {
    return (
      <div className={cn(cardClassName, "text-muted-foreground")}>
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">
          {reference?.name ?? presentation.label}
        </span>
        <Detail>No longer available</Detail>
      </div>
    )
  }

  return (
    <button
      className={cn(
        cardClassName,
        "cursor-pointer outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      )}
      onClick={() => onOpen(target)}
      onDoubleClick={() => onOpen(target, { pinned: true })}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 truncate font-medium">{reference.name}</span>
      {reference.detail === undefined ? null : (
        <Detail>{reference.detail}</Detail>
      )}
    </button>
  )
}

function Detail({ children }: { children: string }) {
  return (
    <>
      <SeparatorDot className="text-muted-foreground/60" />
      <span className="min-w-0 truncate text-muted-foreground">{children}</span>
    </>
  )
}

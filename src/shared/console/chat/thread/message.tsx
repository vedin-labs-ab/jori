import { type ReactNode } from "react"
import { ExpandableText } from "@/components/ui/expandable-text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { CopyButton } from "../../copy"
import { absoluteTime, relativeTime } from "../../time"
import { referencePresentation } from "../presentation"
import { type ChatMessage, type ChatReference } from "../types"

/** A person's turn: contained, on the right, and clamped when it runs
 *  long, so a pasted brief does not push the reply off the screen. The
 *  resource the chat was opened about sits above the words. */
export function PersonMessage({
  context,
  message,
  now,
}: {
  /** The message's context, as the host resolved it. */
  context: ChatReference | undefined
  message: ChatMessage
  now: number
}) {
  return (
    <div className="group/message flex flex-col items-end">
      <div className="min-w-0 max-w-[75%] rounded-lg bg-muted px-3 py-2 text-sm">
        {context === undefined ? null : <ContextLine reference={context} />}
        <ExpandableText maxLines={8}>
          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.text}
          </div>
        </ExpandableText>
      </div>
      <MessageActions message={message} now={now} />
    </div>
  )
}

function ContextLine({ reference }: { reference: ChatReference }) {
  const { icon: Icon, label } = referencePresentation(
    reference.kind,
    reference.name
  )

  return (
    <p className="mb-1 flex items-center gap-1 text-muted-foreground text-xs">
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{reference.name}</span>
    </p>
  )
}

/** Jori's turn: flat and full-width under the mark, never clamped. A
 *  reply still arriving says so to assistive technology. A turn that
 *  continues the one above it — the run still working after a heads-up —
 *  wears no mark of its own and tucks under that message, inset the same. */
export function JoriMessage({
  children,
  className,
  continued = false,
  streaming = false,
}: {
  children: ReactNode
  className?: string
  continued?: boolean
  streaming?: boolean
}) {
  return (
    <div
      aria-busy={streaming ? true : undefined}
      className={cn(
        "group/message flex items-start gap-3",
        continued && "-mt-3",
        className
      )}
    >
      {continued ? (
        <div aria-hidden className="size-5 shrink-0" />
      ) : (
        <BrandIcon className="mt-0.5 size-5" />
      )}
      <div className="grid min-w-0 flex-1 gap-3">{children}</div>
    </div>
  )
}

/** Under a finished message, what can be done with it: a copy of its
 *  text, and when it was sent. The row keeps its place but shows only
 *  while the pointer is over the message or the focus is in the row, so
 *  a thread reads as words alone until one is pointed at. Jori's parts
 *  are cards, so the copy takes the text and nothing else. */
export function MessageActions({
  message,
  now,
}: {
  message: ChatMessage
  now: number
}) {
  return (
    <div className="-mx-1 flex items-center gap-1 text-muted-foreground text-xs opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/message:opacity-100">
      <CopyButton label="message" value={message.text} />
      {/* The time is a button only so a keyboard reaches the moment it
          stands for; there is nothing to press. */}
      <Tooltip>
        <TooltipTrigger
          className="cursor-default rounded-sm px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          type="button"
        >
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {/* A message sent since the clock last ticked is "just now",
                not a moment in the future. */}
            {relativeTime(message.createdAt, Math.max(now, message.createdAt))}
          </time>
        </TooltipTrigger>
        <TooltipContent>{absoluteTime(message.createdAt)}</TooltipContent>
      </Tooltip>
    </div>
  )
}

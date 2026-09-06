import { type ReactNode } from "react"
import { ExpandableText } from "@/components/ui/expandable-text"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
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
    <div className="flex flex-col items-end gap-1">
      <div className="min-w-0 max-w-[75%] rounded-lg bg-muted px-3 py-2 text-sm">
        {context === undefined ? null : <ContextLine reference={context} />}
        <ExpandableText maxLines={8}>
          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.text}
          </div>
        </ExpandableText>
      </div>
      <time
        className="text-muted-foreground text-xs"
        dateTime={new Date(message.createdAt).toISOString()}
        title={absoluteTime(message.createdAt)}
      >
        {/* A message sent since the clock last ticked is "just now", not
            a moment in the future. */}
        {relativeTime(message.createdAt, Math.max(now, message.createdAt))}
      </time>
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
 *  reply still arriving says so to assistive technology. */
export function JoriMessage({
  children,
  className,
  streaming = false,
}: {
  children: ReactNode
  className?: string
  streaming?: boolean
}) {
  return (
    <div
      aria-busy={streaming ? true : undefined}
      className={cn("flex items-start gap-3", className)}
    >
      <BrandIcon className="mt-0.5 size-5" />
      <div className="grid min-w-0 flex-1 gap-3">{children}</div>
    </div>
  )
}

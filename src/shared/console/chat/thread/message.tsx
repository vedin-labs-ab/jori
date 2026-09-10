import { memo, type ReactNode } from "react"
import { ExpandableText } from "@/components/ui/expandable-text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { CopyButton } from "../../copy"
import { type MentionCatalog, splitByMentions } from "../../mentions/scan"
import { absoluteTime, relativeTime } from "../../time"
import { ChatMentionChip } from "../mentions"
import { type OpenTarget } from "../pane/tabs"
import { referencePresentation } from "../presentation"
import {
  type ChatMessage,
  type ChatReference,
  type ResolveReference,
} from "../types"

/** Without a catalog, only resource tokens read as chips. */
const resourceCatalog: MentionCatalog = { resource: true }

/** A person's turn: contained, on the right, and clamped when it runs
 *  long, so a pasted brief does not push the reply off the screen. The
 *  resource the chat was opened about sits above the words; what the
 *  words mention stands in them as chips. Memoized, since the clamp
 *  measures itself on every render it gets. */
export const PersonMessage = memo(function PersonMessage({
  catalog = resourceCatalog,
  context,
  message,
  now,
  onOpenReference,
  resolveReference,
}: {
  /** What the text's tokens may name, beyond resources. */
  catalog?: MentionCatalog
  /** The message's context, as the host resolved it. */
  context: ChatReference | undefined
  message: ChatMessage
  now: number
  onOpenReference?: OpenTarget
  resolveReference?: ResolveReference
}) {
  return (
    <div className="group/message flex flex-col items-end">
      {message.author === undefined ? null : (
        <span className="mb-1 max-w-[75%] truncate text-muted-foreground text-xs">
          {message.author.isViewer ? "You" : message.author.name}
        </span>
      )}
      <div className="min-w-0 max-w-[75%] rounded-lg bg-muted px-3 py-2 text-sm">
        {context === undefined ? null : <ContextLine reference={context} />}
        <ExpandableText maxLines={8}>
          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            <MentionedText
              catalog={catalog}
              onOpen={onOpenReference}
              resolve={resolveReference}
              text={message.text}
            />
          </div>
        </ExpandableText>
      </div>
      <MessageActions message={message} now={now} />
    </div>
  )
})

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
      <div className="grid min-w-0 flex-1 gap-3 text-sm" data-slot="turn">
        {children}
      </div>
    </div>
  )
}

/** Under a finished message, what can be done with it: a copy of its
 *  text, and when it was sent. The row keeps its place but shows only
 *  while the pointer is over the message or the focus is in the row, so
 *  a thread reads as words alone until one is pointed at; a finger has
 *  no pointer to rest, so under one the row stays shown. Jori's parts
 *  are cards, so the copy takes the text and nothing else. */
export function MessageActions({
  message,
  now,
}: {
  message: ChatMessage
  now: number
}) {
  return (
    <div className="-mx-1 flex items-center gap-1 text-muted-foreground text-xs opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100">
      <CopyButton label="message" value={message.text} />
      {/* The time is a button only so a keyboard reaches the moment it
          stands for; there is nothing to press. */}
      <Tooltip>
        <TooltipTrigger
          className="cursor-default rounded-sm px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

/** A person's text with its mention tokens as chips, inline where they
 *  were written: a resource opens beside the chat, the rest are names.
 *  Text with no tokens in it is the text alone. */
function MentionedText({
  catalog,
  onOpen,
  resolve,
  text,
}: {
  catalog: MentionCatalog
  onOpen: OpenTarget | undefined
  resolve: ResolveReference | undefined
  text: string
}) {
  return splitByMentions(text, catalog).map((segment) =>
    "mention" in segment ? (
      <ChatMentionChip
        id={segment.mention.id}
        key={segment.mention.start}
        kind={segment.mention.kind}
        onOpen={onOpen === undefined ? undefined : (target) => onOpen(target)}
        resolve={resolve}
      />
    ) : (
      segment.text
    )
  )
}

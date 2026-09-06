import { ArrowUp, Square, X } from "lucide-react"
import { type KeyboardEvent, useId, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { referencePresentation } from "../presentation"
import { chatColumnClassName } from "../thread"
import { type ChatReference, type ChatRun, isLiveRun } from "../types"

/** Where the person writes. Enter sends and Shift+Enter breaks the line;
 *  while a run is live the send control is the stop control instead.
 *  Disabled with a reason, it says why under the field. */
export function ChatComposer({
  autoFocus = false,
  context,
  disabled = false,
  live,
  onClearContext,
  onSend,
  onStop,
  reason,
}: {
  autoFocus?: boolean
  /** The resource the chat is about, shown as a chip the person can drop. */
  context?: ChatReference
  disabled?: boolean
  live: ChatRun | null
  onClearContext?: () => void
  onSend: (text: string) => void
  onStop: () => void
  /** Why the composer is disabled, shown when it is. */
  reason?: string
}) {
  const reasonId = useId()
  const isLive = isLiveRun(live)
  const { canSend, onKeyDown, send, setText, text } = useDraft(
    onSend,
    !disabled && !isLive
  )

  return (
    <form
      className={cn(chatColumnClassName, "pb-4")}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <InputGroup className="bg-background">
        {context === undefined ? null : (
          <InputGroupAddon align="block-start">
            <ContextChip onClear={onClearContext} reference={context} />
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          aria-describedby={
            disabled && reason !== undefined ? reasonId : undefined
          }
          aria-label="Message"
          autoFocus={autoFocus}
          className="max-h-48 min-h-9 overflow-y-auto text-sm md:text-sm"
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tell Jori what needs doing"
          rows={1}
          value={text}
        />
        <InputGroupAddon align="block-end" className="justify-between gap-2">
          <span
            className="min-w-0 truncate text-muted-foreground text-xs"
            id={reasonId}
          >
            {disabled ? reason : null}
          </span>
          {isLive ? (
            <InputGroupButton
              aria-label="Stop run"
              onClick={onStop}
              size="icon-sm"
              variant="default"
            >
              <Square className="fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send message"
              disabled={!canSend}
              size="icon-sm"
              type="submit"
              variant="default"
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

/** The text being written, and how it leaves: trimmed, on Enter or the
 *  send control, and only while sending is open. Shift+Enter, and Enter
 *  while an input method is composing, keep writing. */
function useDraft(onSend: (text: string) => void, open: boolean) {
  const [text, setText] = useState("")
  const canSend = open && text.trim() !== ""

  const send = () => {
    if (!canSend) {
      return
    }

    onSend(text.trim())
    setText("")
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      send()
    }
  }

  return { canSend, onKeyDown, send, setText, text }
}

/** The resource the chat was opened about, named by its kind's icon, with
 *  a control to send the next message without it. */
function ContextChip({
  onClear,
  reference,
}: {
  onClear: (() => void) | undefined
  reference: ChatReference
}) {
  const { icon: Icon, label } = referencePresentation(
    reference.kind,
    reference.name
  )

  return (
    <Badge className="max-w-full gap-1 pr-1" variant="outline">
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{reference.name}</span>
      {onClear === undefined ? null : (
        <button
          aria-label={`Remove ${reference.name}`}
          className="grid size-4 cursor-pointer place-items-center rounded-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </Badge>
  )
}

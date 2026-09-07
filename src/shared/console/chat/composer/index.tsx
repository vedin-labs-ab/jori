import { type ModelSelection } from "@contracts/models/selection"
import { type MessageContext } from "@contracts/replies/answers"
import { type MouseEvent, useEffect, useId } from "react"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import {
  emptyMentionSources,
  type MentionSources,
  type MentionSuggestion,
} from "../../mentions/sources"
import { chatColumnClassName } from "../thread"
import {
  type ChatContextUsage,
  type ChatReference,
  type ChatRun,
  isLiveRun,
  type ResolveReference,
} from "../types"
import { useComposerEditor } from "./editor"
import { ComposerField, ContextChip } from "./field"
import { ComposerFooter } from "./footer"

/** Where the person writes: plain text with the things it mentions as
 *  chips in it, put there from a sigil's listbox or the "+" menu. Enter
 *  sends and Shift+Enter breaks the line; while a run is live the send
 *  control is the stop control instead. Disabled with a reason, it says
 *  why under the field. The model picker stands with the context ring,
 *  left of it, when the host offers a selection; changing it mid-chat is
 *  fine, the next run takes it. */
export function ChatComposer({
  autoFocus = false,
  context,
  disabled = false,
  live,
  mentions = emptyMentionSources,
  onClearContext,
  onMention,
  onSelect,
  onSend,
  onStop,
  placeholder = "Tell Jori what needs doing",
  reason,
  resolve,
  selection,
  usage,
}: {
  autoFocus?: boolean
  /** The resource the chat is about, shown as a chip the person can drop. */
  context?: ChatReference
  disabled?: boolean
  live: ChatRun | null
  /** What can be mentioned: the host's lists, and its search. */
  mentions?: MentionSources
  onClearContext?: () => void
  /** Takes each resource as it is mentioned, so a host with a pane can
   *  show what the person is talking about. */
  onMention?: (target: MessageContext) => void
  /** Takes the model and effort the next run uses. */
  onSelect?: (selection: ModelSelection) => void
  /** Takes the text with its mention tokens, and the resources they
   *  name. */
  onSend: (text: string, references: MessageContext[]) => void
  onStop: () => void
  /** What the empty field says; the home types asks into it. */
  placeholder?: string
  /** Why the composer is disabled, shown when it is. */
  reason?: string
  /** Names the resources mentioned, for their chips. */
  resolve?: ResolveReference
  /** The model and effort the next run uses, shown as the picker. */
  selection?: ModelSelection
  /** How much of the model's window the thread's latest run is using,
   *  shown as a ring left of the send control; nothing before a run. */
  usage?: ChatContextUsage | null
}) {
  const reasonId = useId()
  const isLive = isLiveRun(live)
  const showsReason = disabled && reason !== undefined
  const shownReason = showsReason ? reason : undefined
  const composer = useComposerEditor({
    disabled,
    onSend,
    open: !disabled && !isLive,
    resolve,
    sources: mentions,
  })

  useFieldState(composer.editor, {
    autoFocus,
    describedBy: showsReason ? reasonId : undefined,
    disabled,
  })

  return (
    <form
      className={chatColumnClassName}
      onSubmit={(event) => {
        event.preventDefault()
        composer.send()
      }}
    >
      <InputGroup
        className="overflow-hidden bg-background"
        onClick={(event) => focusFromFrame(event, composer.editor)}
      >
        {context === undefined ? null : (
          <InputGroupAddon align="block-start">
            <ContextChip onClear={onClearContext} reference={context} />
          </InputGroupAddon>
        )}
        <ComposerField
          composer={composer}
          onSelect={mentioned(composer.selectSuggestion, onMention)}
          placeholder={placeholder}
        />
        <ComposerFooter
          canSend={composer.canSend}
          isLive={isLive}
          mentions={mentions}
          onPick={mentioned(composer.insertMention, onMention)}
          onSelect={onSelect}
          onStop={onStop}
          reason={
            shownReason === undefined
              ? undefined
              : { id: reasonId, text: shownReason }
          }
          selection={selection}
          usage={usage}
        />
      </InputGroup>
    </form>
  )
}

/** What the field says of itself beyond its words: focused on arrival
 *  when asked, disabled with the reason under it. */
function useFieldState(
  editor: ReturnType<typeof useComposerEditor>["editor"],
  {
    autoFocus,
    describedBy,
    disabled,
  }: { autoFocus: boolean; describedBy: string | undefined; disabled: boolean }
) {
  useEffect(() => {
    if (autoFocus && editor !== null && !disabled) {
      editor.commands.focus("end")
    }
  }, [autoFocus, disabled, editor])

  useEffect(() => {
    const element = editor?.view.dom

    if (element === undefined) {
      return
    }

    if (disabled) {
      element.setAttribute("aria-disabled", "true")
    } else {
      element.removeAttribute("aria-disabled")
    }

    if (describedBy === undefined) {
      element.removeAttribute("aria-describedby")
    } else {
      element.setAttribute("aria-describedby", describedBy)
    }
  }, [describedBy, disabled, editor])
}

/** A click on the frame itself, or on the footer beside its controls,
 *  goes to the field, so the person never lands nowhere. */
function focusFromFrame(
  event: MouseEvent<HTMLDivElement>,
  editor: ReturnType<typeof useComposerEditor>["editor"]
) {
  const interactive =
    "button, a, [contenteditable], [role=menu], [role=dialog], [role=listbox]"

  if ((event.target as HTMLElement).closest(interactive) === null) {
    editor?.commands.focus("end")
  }
}

/** The insertion, then the host told of the resource it put in. */
function mentioned(
  insert: (item: MentionSuggestion) => void,
  onMention: ((target: MessageContext) => void) | undefined
) {
  return (item: MentionSuggestion) => {
    insert(item)

    if (item.kind === "resource" && item.target !== undefined) {
      onMention?.(item.target)
    }
  }
}
